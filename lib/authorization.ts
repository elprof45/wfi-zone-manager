export function hasAllowedRole(role: string | null | undefined, allowedRoles: readonly string[]): boolean {
  return Boolean(role && allowedRoles.includes(role));
}

export function canManageOperations(role: string | null | undefined): boolean {
  return hasAllowedRole(role, ['super_admin', 'admin']);
}