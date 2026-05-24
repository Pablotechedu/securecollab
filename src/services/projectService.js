import Project from '../models/Project.js';

async function findProjectById(id) {
  return Project.findById(id);
}

function getProjectRole(project, userId) {
  const entry = project.members.find((m) => m.userId.equals(userId));
  return entry ? entry.role : null;
}

function isProjectMember(project, userId) {
  return project.members.some((m) => m.userId.equals(userId));
}

export { findProjectById, getProjectRole, isProjectMember };
