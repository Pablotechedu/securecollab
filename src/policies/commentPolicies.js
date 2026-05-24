// Pure functions — take plain objects, return boolean. No DB calls.

// Rule 2: only developer+ can create comments
function canCreateComment(projectRole) {
  return projectRole === 'developer' || projectRole === 'project_admin';
}

// Only the author can edit their comment
function canEditComment(user, comment) {
  return comment.authorId.toString() === user._id.toString();
}

// Author or project_admin can delete
function canDeleteComment(user, comment, projectRole) {
  const isAuthor = comment.authorId.toString() === user._id.toString();
  return isAuthor || projectRole === 'project_admin';
}

export { canCreateComment, canEditComment, canDeleteComment };
