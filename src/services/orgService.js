import Organization from '../models/Organization.js';

async function findOrgById(id) {
  return Organization.findById(id);
}

async function isOrgMember(org, userId) {
  return org.members.some((m) => m.userId.equals(userId));
}

function getOrgRole(org, userId) {
  const entry = org.members.find((m) => m.userId.equals(userId));
  return entry ? entry.role : null;
}

function countOrgAdmins(org) {
  return org.members.filter((m) => m.role === 'org_admin').length;
}

export { findOrgById, isOrgMember, getOrgRole, countOrgAdmins };
