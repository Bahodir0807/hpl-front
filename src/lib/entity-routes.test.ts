import { describe, expect, it } from 'vitest';
import { dealWorkspaceHref, getRelatedEntityHref, installationWorkspaceHref } from './entity-routes';

describe('entity routes', () => {
  it('opens a Deal workspace through query params instead of /deals/:id', () => {
    expect(dealWorkspaceHref({ dealId: 'deal-1' })).toBe('/deals?dealId=deal-1');
    expect(getRelatedEntityHref('Deal', 'deal-1')).toBe('/deals?dealId=deal-1');
    expect(getRelatedEntityHref('deal', 'deal-1')).toBe('/deals?dealId=deal-1');
  });

  it('opens a SupplierOrder notification into Deal workspace context', () => {
    expect(getRelatedEntityHref('SupplierOrder', 'so-1')).toBe(
      '/deals?supplierOrderId=so-1',
    );
    expect(
      dealWorkspaceHref({ dealId: 'deal-1', supplierOrderId: 'so-1' }),
    ).toBe('/deals?dealId=deal-1&supplierOrderId=so-1');
  });

  it('opens a DealInstallation notification into the installation workspace', () => {
    expect(getRelatedEntityHref('DealInstallation', 'inst-1')).toBe(
      '/installations?installationId=inst-1',
    );
    expect(getRelatedEntityHref('dealInstallation', 'inst-1')).toBe(
      '/installations?installationId=inst-1',
    );
    expect(installationWorkspaceHref({ dealId: 'deal-1', installationId: 'inst-1' })).toBe(
      '/installations?dealId=deal-1&installationId=inst-1',
    );
  });

  it('opens HEAD/DIRECTOR installation context on a Deal when dealId is known', () => {
    expect(dealWorkspaceHref({ dealId: 'deal-1', installation: true })).toBe(
      '/deals?dealId=deal-1&installation=1',
    );
  });

  it('opens a Manager-to-HEAD handoff notification into the Lead workspace', () => {
    expect(getRelatedEntityHref('Lead', 'lead-1')).toBe('/leads/lead-1');
    expect(getRelatedEntityHref('lead', 'lead-1')).toBe('/leads/lead-1');
  });

  it('opens HEAD recovery tasks on the related Lead or Deal workspace', () => {
    expect(getRelatedEntityHref('LeadRecovery', 'lead-1')).toBe('/leads/lead-1');
    expect(getRelatedEntityHref('leadRecovery', 'lead-1')).toBe('/leads/lead-1');
    expect(getRelatedEntityHref('DealRecovery', 'deal-1')).toBe(
      '/deals?dealId=deal-1',
    );
    expect(getRelatedEntityHref('dealRecovery', 'deal-1')).toBe(
      '/deals?dealId=deal-1',
    );
    expect(getRelatedEntityHref('DealRecovery', 'deal-1')).not.toMatch(
      /^\/deals\/[^?]/,
    );
  });

  it('does not invent a /supplier-orders/[id] page', () => {
    expect(getRelatedEntityHref('SupplierOrder', 'so-1')).not.toContain(
      '/supplier-orders/',
    );
    expect(getRelatedEntityHref('Deal', 'deal-1')).not.toMatch(/^\/deals\/[^?]/);
    expect(getRelatedEntityHref('DealInstallation', 'inst-1')).not.toMatch(
      /^\/deals\/[^?]/,
    );
  });
});
