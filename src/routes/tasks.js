import { Router } from 'express';
import Joi from 'joi';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import validate from '../middleware/validate.js';
import logger from '../utils/logger.js';
import { writeAuditLog } from '../utils/auditLogger.js';
import { getProjectRole } from '../policies/projectPolicies.js';
import { canCreateTask, isProjectArchived, canViewSensitiveDescription } from '../policies/taskPolicies.js';

const router = Router({ mergeParams: true });

const createTaskSchema = Joi.object({
  title: Joi.string().max(200).required(),
  description: Joi.string().max(5000).optional().allow(''),
  assigneeId: Joi.string().optional().allow(null),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  sensitive: Joi.boolean().optional(),
  dueDate: Joi.date().optional().allow(null),
});

// POST /api/projects/:projectId/tasks
router.post('/', validate(createTaskSchema), async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Rule 4: no task creation on archived projects
    if (isProjectArchived(project)) {
      return res.status(403).json({ error: 'Project is archived' });
    }

    const projectRole = getProjectRole(project, requesterId);

    // Rule 2: must be developer or project_admin
    if (!canCreateTask(projectRole)) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'canCreateTask' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { title, description, assigneeId, priority, sensitive, dueDate } = req.body;

    const task = new Task({
      title,
      description,
      projectId,
      reporterId: requesterId,
      assigneeId: assigneeId || null,
      priority: priority || 'medium',
      sensitive: sensitive || false,
      dueDate: dueDate || null,
    });

    await task.save();
    logger.info('Task created', { taskId: task._id.toString(), projectId, actorId: requesterId });
    writeAuditLog({ action: 'task.create', actorId: requesterId, resourceType: 'task', resourceId: task._id, req });

    return res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:projectId/tasks
router.get('/', async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectRole = getProjectRole(project, requesterId);
    if (!projectRole) {
      writeAuditLog({ action: 'security.unauthorized', actorId: requesterId, metadata: { path: req.path, rule: 'projectMembership' }, req });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const rawTasks = await Task.find({ projectId });

    // Rule 6: strip description from sensitive tasks for unauthorized viewers
    const tasks = rawTasks.map((task) => {
      const taskObj = task.toObject();
      if (!canViewSensitiveDescription(req.user, taskObj, projectRole)) {
        taskObj.description = undefined;
      }
      return taskObj;
    });

    return res.status(200).json({ tasks });
  } catch (err) {
    next(err);
  }
});

export default router;
