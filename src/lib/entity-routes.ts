export function dealWorkspaceHref(params: {
  dealId?: string | null;
  supplierOrderId?: string | null;
  installation?: boolean;
}): string {
  const search = new URLSearchParams();

  if (params.dealId) {
    search.set('dealId', params.dealId);
  }

  if (params.supplierOrderId) {
    search.set('supplierOrderId', params.supplierOrderId);
  }

  if (params.installation) {
    search.set('installation', '1');
  }

  const query = search.toString();
  return query ? `/deals?${query}` : '/deals';
}

export function installationWorkspaceHref(params: {
  installationId?: string | null;
  dealId?: string | null;
}): string {
  const search = new URLSearchParams();

  if (params.dealId) {
    search.set('dealId', params.dealId);
  }

  if (params.installationId) {
    search.set('installationId', params.installationId);
  }

  const query = search.toString();
  return query ? `/installations?${query}` : '/installations';
}

export function getRelatedEntityHref(
  relatedType: string | null | undefined,
  relatedId: string | null | undefined,
): string | null {
  if (!relatedType || !relatedId) {
    return null;
  }

  switch (relatedType) {
    case 'Lead':
    case 'lead':
      return `/leads/${relatedId}`;
    case 'Client':
    case 'client':
      return `/clients/${relatedId}`;
    case 'Deal':
    case 'deal':
    case 'DealRecovery':
    case 'dealRecovery':
      return dealWorkspaceHref({ dealId: relatedId });
    case 'LeadRecovery':
    case 'leadRecovery':
      return `/leads/${relatedId}`;
    case 'DealInstallation':
    case 'dealInstallation':
    case 'deal_installation':
      return installationWorkspaceHref({ installationId: relatedId });
    case 'SupplierOrder':
    case 'supplierOrder':
    case 'supplier_order':
      return dealWorkspaceHref({ supplierOrderId: relatedId });
    case 'Order':
    case 'order':
      return '/orders';
    default:
      return null;
  }
}
