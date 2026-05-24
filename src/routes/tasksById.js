import { Router } from 'express';
import Joi from 'joi';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Comment from '../models/Comment.js';
import validate from '../middleware/validate.js';
import logger from '../utils/logger.js';
import { writeAuditLog } from '../utils/auditLogger.js';
import { getProjectRole } from '../policies/projectPolicies.js';
import { isProjectArchived, canChangeStatus, canViewSensitiveDescription } from '../policies/taskPolicies.js';
import { canReadTask, canEditTask } from '../middleware/checkPermission.js';

const router = Router();

const updateTaskSchema = Joi.object({
  title: Joi.string().max(200).optional(),
  description: Joi.string().max(5000).optional().allow(''),
  assigneeId: Joi.string().optional().allow(null),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  sensitive: Joi.boolean().optional(),
  dueDate: Joi.date().optional().allow(null),
});

const patchStatusSchema = Joi.object({
  status: Joi.string().valid('backlog', 'in_progress', 'review', 'done').required(),
});

// GET /api/tasks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!await canReadTask(req.user, task)) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'canReadTask' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch project for Rule 6 (sensitive description visibility)
    const project = await Project.findById(task.projectId);
    const projectRole = project ? getProjectRole(project, requesterId) : null;
    const taskObj = task.toObject();

    if (!canViewSensitiveDescription(req.user, taskObj, projectRole)) {
      taskObj.description = undefined;
    }

    return res.status(200).json(taskObj);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id
router.put('/:id', validate(updateTaskSchema), async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Rules 2 + 4: archived check + role + assignee check
    if (!await canEditTask(req.user, task)) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'canEditTask' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { title, description, assigneeId, priority, sensitive, dueDate } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (assigneeId !== undefined) task.assigneeId = assigneeId || null;
    if (priority !== undefined) task.priority = priority;
    if (sensitive !== undefined) task.sensitive = sensitive;
    if (dueDate !== undefined) task.dueDate = dueDate || null;

    await task.save();
    logger.info('Task updated', { taskId: task._id.toString(), actorId: requesterId });
    writeAuditLog({ action: 'task.update', actorId: requesterId, resourceType: 'task', resourceId: task._id, req });

    return res.status(200).json(task);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', validate(patchStatusSchema), async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const { status } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Rule 4: archived project
    if (isProjectArchived(project)) {
      return res.status(403).json({ error: 'Project is archived' });
    }

    const projectRole = getProjectRole(project, requesterId);

    // Rule 3: moving to 'done' requires assignee or project_admin
    if (!canChangeStatus(req.user, task.toObject(), projectRole, status)) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'canChangeStatus', status }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    task.status = status;
    await task.save();
    logger.info('Task status updated', { taskId: task._id.toString(), status, actorId: requesterId });
    writeAuditLog({ action: 'task.status_change', actorId: requesterId, resourceType: 'task', resourceId: task._id, metadata: { status }, req });

    return res.status(200).json(task);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectRole = getProjectRole(project, requesterId);
    if (projectRole !== 'project_admin') {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'project_admin required' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    await Comment.deleteMany({ taskId: task._id });
    await Task.deleteOne({ _id: task._id });
    logger.info('Task deleted', { taskId: task._id.toString(), projectId: task.projectId.toString(), actorId: requesterId });
    writeAuditLog({ action: 'task.delete', actorId: requesterId, resourceType: 'task', resourceId: task._id, req });

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
