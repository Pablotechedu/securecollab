// Pure functions — take plain objects, return boolean. No DB calls.

function getOrgRole(org, userId) {
  const entry = org.members.find((m) => m.userId.toString() === userId.toString());
  return entry ? entry.role : null;
}

function isOrgMember(org, userId) {
  return getOrgRole(org, userId) !== null;
}

function isOrgAdmin(org, userId) {
  return getOrgRole(org, userId) === 'org_admin';
}

// Rule 7: user cannot invite themselves
function cannotInviteSelf(requesterId, targetUserId) {
  return requesterId.toString() !== targetUserId.toString();
}

// Rule 5: cannot remove the last org_admin
function canRemoveMember(org, targetUserId) {
  const target = org.members.find((m) => m.userId.toString() === targetUserId.toString());
  if (!target) return false;
  if (target.role !== 'org_admin') return true;
  const adminCount = org.members.filter((m) => m.role === 'org_admin').length;
  return adminCount > 1;
}

// Rule 8: super_admin cannot modify org/project data
function isSuperAdminModifying(user) {
  return user.role === 'super_admin';
}

export { getOrgRole, isOrgMember, isOrgAdmin, cannotInviteSelf, canRemoveMember, isSuperAdminModifying };
