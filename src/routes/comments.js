import { Router } from 'express';
import Joi from 'joi';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Comment from '../models/Comment.js';
import validate from '../middleware/validate.js';
import logger from '../utils/logger.js';
import { commentLimit } from '../middleware/rateLimiters.js';
import { writeAuditLog } from '../utils/auditLogger.js';
import { getProjectRole } from '../policies/projectPolicies.js';
import { canCreateComment } from '../policies/commentPolicies.js';
import { isProjectArchived } from '../policies/taskPolicies.js';

const router = Router({ mergeParams: true });

const createCommentSchema = Joi.object({
  body: Joi.string().max(2000).required(),
});

// POST /api/tasks/:taskId/comments
router.post('/', commentLimit, validate(createCommentSchema), async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Rule 4: archived projects block comments
    if (isProjectArchived(project.toObject())) {
      return res.status(403).json({ error: 'Project is archived' });
    }

    const projectRole = getProjectRole(project, requesterId);

    // Rule 2: only developer+ can comment
    if (!canCreateComment(projectRole)) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'canCreateComment' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { body } = req.body;

    const comment = new Comment({
      taskId,
      authorId: requesterId,
      body,
    });

    await comment.save();
    logger.info('Comment created', { commentId: comment._id.toString(), taskId, actorId: requesterId });

    return res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:taskId/comments
router.get('/', async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectRole = getProjectRole(project, requesterId);
    if (!projectRole) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'projectMembership' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const comments = await Comment.find({ taskId }).sort({ createdAt: 1 });

    return res.status(200).json({ comments });
  } catch (err) {
    next(err);
  }
});

export default router;
