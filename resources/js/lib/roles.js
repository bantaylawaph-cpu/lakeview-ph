// resources/js/lib/roles.js
// Centralized role & scope metadata mirroring backend Role model.
export const ROLES = Object.freeze({
  SUPERADMIN: 'superadmin',
  ORG_ADMIN: 'org_admin',
  CONTRIBUTOR: 'contributor',
  PUBLIC: 'public',
});

export const TENANT_SCOPED = new Set([ROLES.ORG_ADMIN, ROLES.CONTRIBUTOR]);
export const SYSTEM_SCOPED = new Set([ROLES.SUPERADMIN, ROLES.PUBLIC]);

export function isTenantScoped(role) { return TENANT_SCOPED.has(role); }
export function isSystemScoped(role) { return SYSTEM_SCOPED.has(role); }

// Simple label map (customize for UI display if needed)
export const ROLE_LABEL = Object.freeze({
  [ROLES.SUPERADMIN]: 'Super Admin',
  [ROLES.ORG_ADMIN]: 'Organization Admin',
  [ROLES.CONTRIBUTOR]: 'Contributor',
  [ROLES.PUBLIC]: 'Public User',
});
