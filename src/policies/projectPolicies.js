// Pure functions — take plain objects, return boolean. No DB calls.

function getProjectRole(project, userId) {
  const entry = project.members.find((m) => m.userId.toString() === userId.toString());
  return entry ? entry.role : null;
}

function isProjectMember(project, userId) {
  return getProjectRole(project, userId) !== null;
}

// Rule 1: user must be org member; private projects also require project membership
function canViewProject(user, org, project) {
  const isOrgMember = org.members.some((m) => m.userId.toString() === user._id.toString());
  if (!isOrgMember) return false;
  if (project.visibility === 'private') {
    return isProjectMember(project, user._id);
  }
  return true;
}

function canManageProject(user, project) {
  return getProjectRole(project, user._id) === 'project_admin';
}

export { getProjectRole, isProjectMember, canViewProject, canManageProject };
