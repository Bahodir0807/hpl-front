type RoleLike = string | { name: string };

export type RoleAccessUser = {
  roles?: RoleLike[];
} | null | undefined;

function roleName(role: RoleLike): string {
  return typeof role === "string" ? role : role.name;
}

export function hasRole(
  user: RoleAccessUser,
  ...roles: string[]
): boolean {
  return user?.roles?.some((role) => roles.includes(roleName(role))) ?? false;
}

export function isManagerOnly(user: RoleAccessUser): boolean {
  return (
    hasRole(user, "MANAGER") &&
    !hasRole(user, "HEAD", "ADMIN", "DIRECTOR", "FINANCIER")
  );
}

export function isDirectorOrAbove(user: RoleAccessUser): boolean {
  return hasRole(user, "DIRECTOR", "ADMIN", "HEAD");
}

export function isHeadOrAbove(user: RoleAccessUser): boolean {
  return hasRole(user, "HEAD", "ADMIN", "DIRECTOR");
}

export function hasElevatedAccess(roles: string[]): boolean {
  if (roles.length === 0) {
    return false;
  }

  return roles.includes("ADMIN") || roles.includes("HEAD");
}

export function canManagerViewReports(roles: string[]): boolean {
  if (roles.length === 0) {
    return false;
  }

  if (hasElevatedAccess(roles)) {
    return true;
  }

  return !roles.includes("MANAGER");
}

export function canManagerViewExpectedReceipts(roles: string[]): boolean {
  if (roles.length === 0) {
    return false;
  }

  if (hasElevatedAccess(roles)) {
    return true;
  }

  return !roles.includes("MANAGER");
}
