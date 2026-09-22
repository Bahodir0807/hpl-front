export const FACADE_PRICING_READ_PURCHASE = 'facade_pricing:read_purchase';
export const FACADE_PRICING_MANAGE_OFFERS = 'facade_pricing:manage_offers';
export const FACADE_PRICING_PREPARE = 'facade_pricing:prepare';
export const FACADE_PRICING_APPROVE = 'facade_pricing:approve';

export function canManageFacadeOffers(
  permissions: readonly string[] | null | undefined,
): boolean {
  return Boolean(permissions?.includes(FACADE_PRICING_MANAGE_OFFERS));
}

export function canReadFacadePurchase(
  permissions: readonly string[] | null | undefined,
): boolean {
  return Boolean(permissions?.includes(FACADE_PRICING_READ_PURCHASE));
}

export function canPrepareFacadeCommercial(
  permissions: readonly string[] | null | undefined,
): boolean {
  return Boolean(permissions?.includes(FACADE_PRICING_PREPARE));
}

export function canApproveFacadeCommercial(
  permissions: readonly string[] | null | undefined,
): boolean {
  return Boolean(permissions?.includes(FACADE_PRICING_APPROVE));
}

export function canViewFacadeCommercial(
  permissions: readonly string[] | null | undefined,
): boolean {
  const set = new Set(permissions ?? []);
  return (
    set.has(FACADE_PRICING_PREPARE) ||
    set.has(FACADE_PRICING_APPROVE) ||
    set.has(FACADE_PRICING_READ_PURCHASE) ||
    set.has('leads:read')
  );
}
