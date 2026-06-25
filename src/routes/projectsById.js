import { Router } from 'express';
import Joi from 'joi';
import Organization from '../models/Organization.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import validate from '../middleware/validate.js';
import logger from '../utils/logger.js';
import { writeAuditLog } from '../utils/auditLogger.js';
import { canViewProject, getProjectRole } from '../policies/projectPolicies.js';
import { getOrgRole, isSuperAdminModifying } from '../policies/orgPolicies.js';
import { isProjectArchived } from '../policies/taskPolicies.js';

const router = Router();

const updateProjectSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  visibility: Joi.string().valid('private', 'internal').optional(),
  status: Joi.string().valid('active', 'archived').optional(),
});

const addProjectMemberSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required(),
  role: Joi.string().valid('project_admin', 'developer', 'viewer').required(),
});

// GET /api/projects/:id
router.get('/:id', async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const org = await Organization.findById(project.orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Rule 1: org membership required; private also requires project membership
    if (!canViewProject(req.user, org.toObject(), project.toObject())) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'canViewProject' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.status(200).json(project);
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id
router.put('/:id', validate(updateProjectSchema), async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    // Rule 8: super_admin cannot modify project data
    if (isSuperAdminModifying(req.user)) {
      writeAuditLog({ action: 'security.unauthorized', actorId: req.user._id, metadata: { path: req.path, rule: 'isSuperAdminModifying' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectRole = getProjectRole(project, requesterId);
    if (projectRole !== 'project_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, description, visibility, status } = req.body;

    // Rule 4: an archived project's content is immutable. The only permitted
    // change is un-archiving it (status -> active); block all content edits.
    if (isProjectArchived(project.toObject())) {
      const onlyUnarchiving =
        status === 'active' &&
        name === undefined &&
        description === undefined &&
        visibility === undefined;
      if (!onlyUnarchiving) {
        return res.status(403).json({ error: 'Project is archived' });
      }
    }

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (visibility !== undefined) project.visibility = visibility;
    if (status !== undefined) project.status = status;

    await project.save();
    logger.info('Project updated', { projectId: project._id.toString(), actorId: requesterId });
    writeAuditLog({ action: 'project.update', actorId: requesterId, resourceType: 'project', resourceId: project._id, metadata: { fields: Object.keys(req.body) }, req });

    return res.status(200).json(project);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    // Rule 8: super_admin cannot modify project data
    if (isSuperAdminModifying(req.user)) {
      writeAuditLog({ action: 'security.unauthorized', actorId: req.user._id, metadata: { path: req.path, rule: 'isSuperAdminModifying' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const org = await Organization.findById(project.orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const orgRole = getOrgRole(org, requesterId);
    if (orgRole !== 'org_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await Project.deleteOne({ _id: project._id });
    logger.info('Project deleted', { projectId: project._id.toString(), orgId: project.orgId.toString(), actorId: requesterId });
    writeAuditLog({ action: 'project.delete', actorId: requesterId, resourceType: 'project', resourceId: project._id, metadata: { orgId: project.orgId.toString() }, req });

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/members — returns member list with user details
router.get('/:id/members', async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const org = await Organization.findById(project.orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (!canViewProject(req.user, org.toObject(), project.toObject())) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'canViewProject' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIds = project.members.map((m) => m.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('_id name email').lean();
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    const members = project.members.map((m) => {
      const u = userMap[m.userId.toString()] || {};
      return { userId: m.userId, name: u.name ?? '', email: u.email ?? '', role: m.role };
    });

    return res.status(200).json({ members });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/members
router.post('/:id/members', validate(addProjectMemberSchema), async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const { email, role } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectRole = getProjectRole(project, requesterId);
    if (projectRole !== 'project_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Rule 4: archived projects are immutable — block adding members
    if (isProjectArchived(project.toObject())) {
      return res.status(403).json({ error: 'Project is archived' });
    }

    const targetUser = await User.findOne({ email, isActive: true }).lean();
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resolvedUserId = targetUser._id;
    const alreadyMember = project.members.some((m) => m.userId.equals(resolvedUserId));
    if (alreadyMember) {
      return res.status(409).json({ error: 'User is already a project member' });
    }

    project.members.push({ userId: resolvedUserId, role });
    await project.save();
    logger.info('Member added to project', { projectId: project._id.toString(), targetUserId: resolvedUserId.toString(), actorId: requesterId });
    writeAuditLog({ action: 'project.member.add', actorId: requesterId, resourceType: 'project', resourceId: project._id, metadata: { targetUserId: resolvedUserId.toString(), targetEmail: email, role }, req });

    return res.status(201).json({ message: 'Member added' });
  } catch (err) {
    next(err);
  }
});

export default router;
