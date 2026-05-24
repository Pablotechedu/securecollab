// Pure functions — take plain objects, return boolean. No DB calls.

// Rule 4: no mutations on archived projects
function isProjectArchived(project) {
  return project.status === 'archived';
}

// Rule 2: only developer+ can create tasks
function canCreateTask(projectRole) {
  return projectRole === 'developer' || projectRole === 'project_admin';
}

// Rule 2 + 4: project_admin can edit any task; everyone else only if they are the assignee
function canEditTask(user, task, projectRole, project) {
  if (isProjectArchived(project)) return false;
  if (projectRole === 'project_admin') return true;
  const isAssignee = task.assigneeId && task.assigneeId.toString() === user._id.toString();
  return isAssignee;
}

// Any project member (viewer+) can read a task
function canReadTask(projectRole) {
  return projectRole !== null && projectRole !== undefined;
}

// Rule 3: moving to 'done' requires assignee or project_admin
function canChangeStatus(user, task, projectRole, newStatus) {
  if (newStatus === 'done') {
    const isAssignee = task.assigneeId && task.assigneeId.toString() === user._id.toString();
    return isAssignee || projectRole === 'project_admin';
  }
  return projectRole === 'developer' || projectRole === 'project_admin';
}

// Rule 6: sensitive task description only visible to assignee and project_admin
function canViewSensitiveDescription(user, task, projectRole) {
  if (!task.sensitive) return true;
  const isAssignee = task.assigneeId && task.assigneeId.toString() === user._id.toString();
  return isAssignee || projectRole === 'project_admin';
}

export { isProjectArchived, canCreateTask, canReadTask, canEditTask, canChangeStatus, canViewSensitiveDescription };
