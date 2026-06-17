import { Router } from 'express';
import Joi from 'joi';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import validate from '../middleware/validate.js';
import logger from '../utils/logger.js';
import { writeAuditLog } from '../utils/auditLogger.js';
import { getOrgRole, cannotInviteSelf, canRemoveMember, isSuperAdminModifying } from '../policies/orgPolicies.js';

const router = Router();

const createOrgSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(500).optional().allow(''),
});

const updateOrgSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
});

const addMemberSchema = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid('org_admin', 'member').required(),
});

// POST /api/orgs
router.post('/', validate(createOrgSchema), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const requesterId = req.user._id;

    const org = new Organization({
      name,
      description,
      ownerId: requesterId,
      members: [{ userId: requesterId, role: 'org_admin' }],
    });

    await org.save();
    logger.info('Organization created', { orgId: org._id.toString(), actorId: requesterId });

    return res.status(201).json(org);
  } catch (err) {
    next(err);
  }
});

// GET /api/orgs
router.get('/', async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const organizations = await Organization.find({ 'members.userId': requesterId });
    return res.status(200).json({ organizations });
  } catch (err) {
    next(err);
  }
});

// GET /api/orgs/:id
router.get('/:id', async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const isSuperAdmin = req.user.role === 'super_admin';
    const orgRole = getOrgRole(org, requesterId);
    if (!isSuperAdmin && !orgRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.status(200).json(org);
  } catch (err) {
    next(err);
  }
});

// PUT /api/orgs/:id
router.put('/:id', validate(updateOrgSchema), async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    // Rule 8: super_admin cannot modify org data
    if (isSuperAdminModifying(req.user)) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'isSuperAdminModifying' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const orgRole = getOrgRole(org, requesterId);
    if (orgRole !== 'org_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, description } = req.body;
    if (name !== undefined) org.name = name;
    if (description !== undefined) org.description = description;

    await org.save();
    logger.info('Organization updated', { orgId: org._id.toString(), actorId: requesterId });

    return res.status(200).json(org);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/orgs/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const orgRole = getOrgRole(org, requesterId);
    if (orgRole !== 'org_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await Organization.deleteOne({ _id: org._id });
    logger.info('Organization deleted', { orgId: org._id.toString(), actorId: requesterId });

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/orgs/:id/members
router.post('/:id/members', validate(addMemberSchema), async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const { userId, role } = req.body;

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const requesterRole = getOrgRole(org, requesterId);
    if (requesterRole !== 'org_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Rule 7: cannot invite yourself
    if (!cannotInviteSelf(requesterId, userId)) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'cannotInviteSelf' }, req });
      return res.status(403).json({ error: 'Cannot invite yourself' });
    }

    const targetUser = await User.findById(userId).lean();
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const alreadyMember = org.members.some((m) => m.userId.equals(userId));
    if (alreadyMember) {
      return res.status(409).json({ error: 'User is already a member' });
    }

    org.members.push({ userId, role });
    await org.save();
    logger.info('Member added to organization', { orgId: org._id.toString(), targetUserId: userId, actorId: requesterId });
    writeAuditLog({ action: 'org.member.add', actorId: requesterId, resourceType: 'organization', resourceId: org._id, metadata: { targetUserId: userId, role }, req });

    return res.status(201).json({ message: 'Member added' });
  } catch (err) {
    next(err);
  }
});

// GET /api/orgs/:id/members — returns member list with user details
router.get('/:id/members', async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const isSuperAdmin = req.user.role === 'super_admin';
    const orgRole = getOrgRole(org, requesterId);
    if (!isSuperAdmin && !orgRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIds = org.members.map((m) => m.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('_id name email').lean();
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    const members = org.members.map((m) => {
      const u = userMap[m.userId.toString()] || {};
      return { userId: m.userId, name: u.name ?? '', email: u.email ?? '', role: m.role };
    });

    return res.status(200).json({ members });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/orgs/:id/members/:userId
router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const { userId } = req.params;

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const requesterRole = getOrgRole(org, requesterId);
    if (requesterRole !== 'org_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Rule 5: cannot remove the last org_admin
    const targetMember = org.members.find((m) => m.userId.equals(userId));
    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (!canRemoveMember(org.toObject(), userId)) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'canRemoveMember' }, req });
      return res.status(403).json({ error: 'Cannot remove the last org admin' });
    }

    org.members = org.members.filter((m) => !m.userId.equals(userId));
    await org.save();
    logger.info('Member removed from organization', { orgId: org._id.toString(), targetUserId: userId, actorId: requesterId });
    writeAuditLog({ action: 'org.member.remove', actorId: requesterId, resourceType: 'organization', resourceId: org._id, metadata: { targetUserId: userId }, req });

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
