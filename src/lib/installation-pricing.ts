export const INSTALLATION_READ = 'installation:read';
export const INSTALLATION_UPDATE_TECHNICAL = 'installation:update_technical';
export const INSTALLATION_PRICING_READ_COST = 'installation_pricing:read_cost';
export const INSTALLATION_PRICING_MANAGE_CONTRACTORS =
  'installation_pricing:manage_contractors';
export const INSTALLATION_PRICING_MANAGE_RATES =
  'installation_pricing:manage_rates';
export const INSTALLATION_PRICING_PREPARE = 'installation_pricing:prepare';
export const INSTALLATION_PRICING_APPROVE = 'installation_pricing:approve';

export function canManageInstallationCatalog(
  permissions: readonly string[] | null | undefined,
): boolean {
  return Boolean(
    permissions?.includes(INSTALLATION_PRICING_MANAGE_CONTRACTORS),
  );
}

export function canReadInstallationCost(
  permissions: readonly string[] | null | undefined,
): boolean {
  return Boolean(permissions?.includes(INSTALLATION_PRICING_READ_COST));
}

export function canPrepareInstallationCommercial(
  permissions: readonly string[] | null | undefined,
): boolean {
  return Boolean(permissions?.includes(INSTALLATION_PRICING_PREPARE));
}

export function canApproveInstallationCommercial(
  permissions: readonly string[] | null | undefined,
): boolean {
  return Boolean(permissions?.includes(INSTALLATION_PRICING_APPROVE));
}

export function canUpdateInstallationTechnical(
  permissions: readonly string[] | null | undefined,
): boolean {
  return Boolean(permissions?.includes(INSTALLATION_UPDATE_TECHNICAL));
}
