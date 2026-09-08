export const CALCULATIONS_CREATE_PERMISSION = 'calculations:create';
export const CALCULATIONS_READ_PERMISSION = 'calculations:read';
export const CALCULATIONS_READ_ALL_PERMISSION = 'calculations:read_all';
export const CALCULATIONS_UPDATE_PERMISSION = 'calculations:update';
export const QUOTES_CREATE_PERMISSION = 'quotes:create';
export const QUOTES_READ_ALL_PERMISSION = 'quotes:read_all';
export const QUOTES_APPROVE_PERMISSION = 'quotes:approve';
export const QUOTES_CLIENT_ACCEPT_PERMISSION = 'quotes:client_accept';
export const LEADS_COMMERCIAL_QUALIFY_PERMISSION = 'leads:commercial_qualify';

export const COMMERCIAL_CALCULATION_WAITING_COPY =
  'Коммерческий расчёт ожидает руководителя.';

export const HPL_SELLING_COEFFICIENT = 2;

export const PURCHASE_PRICE_LABEL = 'Закупочная цена, CNY/м²';

export const PURCHASE_PRICE_REQUIRED_MESSAGE =
  'Укажите закупочную цену, CNY/м²';

export const PURCHASE_PRICE_INVALID_MESSAGE =
  'Закупочная цена должна быть числом больше 0, CNY/м²';

function hasPermission(
  permissions: readonly string[] | null | undefined,
  slug: string,
): boolean {
  return Boolean(permissions?.includes(slug));
}

function hasCommercialPriceAuthority(
  permissions: readonly string[] | null | undefined,
): boolean {
  return (
    hasPermission(permissions, LEADS_COMMERCIAL_QUALIFY_PERMISSION) ||
    hasPermission(permissions, QUOTES_APPROVE_PERMISSION)
  );
}

/**
 * Sell-price calculation is Stage-2 commercial work.
 * `calculations:create` alone is not enough: MANAGER currently still has that
 * backend grant, but must not run priced preview/save.
 */
export function canRunCommercialCalculation(
  permissions: readonly string[] | null | undefined,
): boolean {
  if (!hasPermission(permissions, CALCULATIONS_CREATE_PERMISSION)) {
    return false;
  }

  return (
    hasCommercialPriceAuthority(permissions) ||
    hasPermission(permissions, CALCULATIONS_READ_ALL_PERMISSION)
  );
}

export function canEnterManualPurchasePrice(
  permissions: readonly string[] | null | undefined,
): boolean {
  return hasPermission(permissions, LEADS_COMMERCIAL_QUALIFY_PERMISSION);
}

export function validateManualPurchasePriceCny(
  value: string,
): string | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) {
    return PURCHASE_PRICE_REQUIRED_MESSAGE;
  }

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) {
    return PURCHASE_PRICE_INVALID_MESSAGE;
  }

  return null;
}

export function formatCnyUsdRateLabel(rate: string | number | null | undefined): string {
  if (rate === undefined || rate === null || rate === '') {
    return '1 CNY = — USD';
  }

  return `1 CNY = ${rate} USD`;
}

export function canConvertCalculationToQuote(
  permissions: readonly string[] | null | undefined,
): boolean {
  if (!hasPermission(permissions, QUOTES_CREATE_PERMISSION)) {
    return false;
  }

  return (
    hasCommercialPriceAuthority(permissions) ||
    hasPermission(permissions, QUOTES_READ_ALL_PERMISSION)
  );
}

export function canViewCommercialCalculation(
  permissions: readonly string[] | null | undefined,
): boolean {
  return hasPermission(permissions, CALCULATIONS_READ_PERMISSION);
}

export function canCreateCalculationRequest(
  permissions: readonly string[] | null | undefined,
): boolean {
  return hasPermission(permissions, CALCULATIONS_CREATE_PERMISSION);
}

/** Qualify auto-creates one DRAFT. Manual create would duplicate it. */
export function canShowCreateCalculationRequestAction(
  permissions?: readonly string[] | null,
): boolean {
  void permissions;
  return false;
}

/**
 * MANAGER capability to submit a DRAFT calculation request.
 * Positive grants: calculations:create + calculations:update + quotes:client_accept.
 * HEAD has create/update but not quotes:client_accept, so canSubmit is false.
 */
export function canSubmitCalculationRequest(
  permissions: readonly string[] | null | undefined,
): boolean {
  return (
    hasPermission(permissions, CALCULATIONS_CREATE_PERMISSION) &&
    hasPermission(permissions, CALCULATIONS_UPDATE_PERMISSION) &&
    hasPermission(permissions, QUOTES_CLIENT_ACCEPT_PERMISSION)
  );
}

export function canShowSubmitCalculationRequestToHead(
  permissions?: readonly string[] | null,
): boolean {
  return canSubmitCalculationRequest(permissions);
}

export function shouldWaitForCommercialCalculation({
  permissions,
  hasCalculation,
  stage1Complete,
}: {
  permissions: readonly string[] | null | undefined;
  hasCalculation: boolean;
  stage1Complete: boolean;
}): boolean {
  return (
    stage1Complete &&
    !hasCalculation &&
    !canRunCommercialCalculation(permissions) &&
    !canCreateCalculationRequest(permissions)
  );
}
