import { Router } from 'express';
import Joi from 'joi';
import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import validate from '../middleware/validate.js';
import logger from '../utils/logger.js';
import { writeAuditLog } from '../utils/auditLogger.js';
import { getProjectRole } from '../policies/projectPolicies.js';
import { canEditComment, canDeleteComment } from '../policies/commentPolicies.js';
import { isProjectArchived } from '../policies/taskPolicies.js';

const router = Router();

const updateCommentSchema = Joi.object({
  body: Joi.string().max(2000).required(),
});

// PUT /api/comments/:id
router.put('/:id', validate(updateCommentSchema), async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only the author can edit
    if (!canEditComment(req.user, comment.toObject())) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'canEditComment' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Rule 4: archived projects are immutable — block comment edits
    const task = await Task.findById(comment.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (isProjectArchived(project.toObject())) {
      return res.status(403).json({ error: 'Project is archived' });
    }

    comment.body = req.body.body;
    comment.editedAt = new Date();
    await comment.save();
    logger.info('Comment updated', { commentId: comment._id.toString(), actorId: requesterId });
    writeAuditLog({ action: 'comment.edit', actorId: requesterId, resourceType: 'comment', resourceId: comment._id, metadata: { taskId: comment.taskId.toString() }, req });

    return res.status(200).json(comment);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/comments/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const task = await Task.findById(comment.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectRole = getProjectRole(project, requesterId);

    // Authorization first: an unauthorized actor always gets a generic Forbidden
    // (and an audit entry), never the archived-state message.
    if (!canDeleteComment(req.user, comment.toObject(), projectRole)) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'canDeleteComment' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Rule 4: archived projects are immutable — block comment deletes
    if (isProjectArchived(project.toObject())) {
      return res.status(403).json({ error: 'Project is archived' });
    }

    await Comment.deleteOne({ _id: comment._id });
    logger.info('Comment deleted', { commentId: comment._id.toString(), actorId: requesterId });
    writeAuditLog({ action: 'comment.delete', actorId: requesterId, resourceType: 'comment', resourceId: comment._id, metadata: { taskId: comment.taskId.toString() }, req });

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
