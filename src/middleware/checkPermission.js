import Project from '../models/Project.js';
import { getProjectRole } from '../policies/projectPolicies.js';
import { canReadTask as policyCanReadTask, canEditTask as policyCanEditTask } from '../policies/taskPolicies.js';

async function canReadTask(user, task) {
  const project = await Project.findById(task.projectId).lean();
  if (!project) return false;
  const role = getProjectRole(project, user._id);
  return policyCanReadTask(role);
}

async function canEditTask(user, task) {
  const project = await Project.findById(task.projectId).lean();
  if (!project) return false;
  const role = getProjectRole(project, user._id);
  return policyCanEditTask(user, task, role, project);
}

export { canReadTask, canEditTask };
