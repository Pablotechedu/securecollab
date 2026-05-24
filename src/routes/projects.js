import { Router } from 'express';
import Joi from 'joi';
import Organization from '../models/Organization.js';
import Project from '../models/Project.js';
import validate from '../middleware/validate.js';
import logger from '../utils/logger.js';

const router = Router({ mergeParams: true });

const createProjectSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(1000).optional().allow(''),
  visibility: Joi.string().valid('private', 'internal').optional(),
});

// Helper: get org-level role for a user
function getOrgRole(org, userId) {
  const entry = org.members.find((m) => m.userId.equals(userId));
  return entry ? entry.role : null;
}

// POST /api/orgs/:orgId/projects
router.post('/', validate(createProjectSchema), async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const { orgId } = req.params;

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const orgRole = getOrgRole(org, requesterId);
    if (orgRole !== 'org_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, description, visibility } = req.body;

    const project = new Project({
      name,
      description,
      orgId,
      visibility: visibility || 'internal',
      members: [{ userId: requesterId, role: 'project_admin' }],
      status: 'active',
    });

    await project.save();
    logger.info('Project created', { projectId: project._id.toString(), orgId, actorId: requesterId });

    return res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// GET /api/orgs/:orgId/projects
router.get('/', async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const { orgId } = req.params;

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const orgRole = getOrgRole(org, requesterId);
    if (!orgRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const allProjects = await Project.find({ orgId });

    // Filter: private projects only visible if requester is in project.members
    const projects = allProjects.filter((project) => {
      if (project.visibility === 'private') {
        return project.members.some((m) => m.userId.equals(requesterId));
      }
      return true;
    });

    return res.status(200).json({ projects });
  } catch (err) {
    next(err);
  }
});

export default router;
