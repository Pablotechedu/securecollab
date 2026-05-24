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

const router = Router();

const updateProjectSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  visibility: Joi.string().valid('private', 'internal').optional(),
  status: Joi.string().valid('active', 'archived').optional(),
});

const addProjectMemberSchema = Joi.object({
  userId: Joi.string().required(),
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
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (visibility !== undefined) project.visibility = visibility;
    if (status !== undefined) project.status = status;

    await project.save();
    logger.info('Project updated', { projectId: project._id.toString(), actorId: requesterId });

    return res.status(200).json(project);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res, next) => {
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

    const orgRole = getOrgRole(org, requesterId);
    if (orgRole !== 'org_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await Project.deleteOne({ _id: project._id });
    logger.info('Project deleted', { projectId: project._id.toString(), orgId: project.orgId.toString(), actorId: requesterId });

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/members
router.post('/:id/members', validate(addProjectMemberSchema), async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const { userId, role } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectRole = getProjectRole(project, requesterId);
    if (projectRole !== 'project_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const targetUser = await User.findById(userId).lean();
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const alreadyMember = project.members.some((m) => m.userId.equals(userId));
    if (alreadyMember) {
      return res.status(409).json({ error: 'User is already a project member' });
    }

    project.members.push({ userId, role });
    await project.save();
    logger.info('Member added to project', { projectId: project._id.toString(), targetUserId: userId, actorId: requesterId });

    return res.status(201).json({ message: 'Member added' });
  } catch (err) {
    next(err);
  }
});

export default router;
