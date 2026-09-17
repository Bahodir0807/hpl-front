export type AuthRoutingUser = {
  permissions?: string[];
} | null | undefined;

const LANDING_CANDIDATES = [
  { path: '/leads', permission: 'leads:read' },
  { path: '/deals', permission: 'deals:read' },
  { path: '/orders', permission: 'orders:read' },
  { path: '/products', permission: 'products:read' },
  { path: '/receipts', permission: 'inventory:read' },
  { path: '/reports', permission: 'reports:read' },
  { path: '/users', permission: 'users:read' },
] as const;

export const ACCOUNTANT_PERMISSION_SHAPE = [
  'auth:me',
  'products:read',
  'clients:read',
  'clients:read_all',
  'deals:read',
  'deals:read_all',
  'orders:read',
  'payments:confirm',
  'files:read',
  'audit:read',
  'currency_rates:read',
] as const;

export const STOREKEEPER_PERMISSION_SHAPE = [
  'auth:me',
  'references:read',
  'products:read',
  'orders:read',
  'deliveries:create',
  'inventory:read',
  'inventory:manage',
  'warehouse_purchases:receive',
] as const;

export function prefersAccountantWorkspace(
  permissions: readonly string[] | null | undefined,
): boolean {
  const set = new Set(permissions ?? []);
  return set.has('payments:confirm') && set.has('orders:read') && !set.has('leads:read');
}

export function prefersStorekeeperWorkspace(
  permissions: readonly string[] | null | undefined,
): boolean {
  const set = new Set(permissions ?? []);
  return (
    set.has('inventory:read') &&
    set.has('warehouse_purchases:receive') &&
    !set.has('leads:read') &&
    !set.has('payments:confirm')
  );
}

export function getDefaultAuthenticatedPath(user: AuthRoutingUser): string {
  const permissions = user?.permissions ?? [];

  if (prefersAccountantWorkspace(permissions)) {
    return '/orders';
  }

  if (prefersStorekeeperWorkspace(permissions)) {
    return '/receipts';
  }

  const permissionSet = new Set(permissions);
  const candidate = LANDING_CANDIDATES.find(({ permission }) =>
    permissionSet.has(permission),
  );

  return candidate?.path ?? '/';
}
