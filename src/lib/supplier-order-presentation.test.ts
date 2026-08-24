import { describe, expect, it } from 'vitest';
import {
  canCreateSupplierOrder,
  getSupplierOrderActions,
  normalizeSupplierOrderStatus,
  supplierOrderStatusLabels,
  supplierOrderStatuses,
} from './supplier-order-presentation';

const HEAD = ['supplier_orders:manage', 'supplier_orders:confirm_client_delivery'];
const DIRECTOR = [...HEAD];
const MANAGER = ['supplier_orders:confirm_client_delivery'];
const ADMIN_ONLY = ['users:manage', 'admin:queues'];

describe('supplier order presentation', () => {
  it('labels current backend statuses including READY_FOR_SHIPMENT, SHIPPED and DELIVERED', () => {
    expect(supplierOrderStatusLabels.READY_FOR_SHIPMENT).toBe('Готов к отгрузке');
    expect(supplierOrderStatusLabels.SHIPPED).toBe('Отгружено');
    expect(supplierOrderStatusLabels.DELIVERED).toBe('Доставлено');
    expect(supplierOrderStatuses).not.toContain('READY_TO_SHIP');
    expect(normalizeSupplierOrderStatus('READY_TO_SHIP')).toBeNull();
  });

  it('allows HEAD and DIRECTOR to create, but not MANAGER or ADMIN-only', () => {
    expect(canCreateSupplierOrder(HEAD)).toBe(true);
    expect(canCreateSupplierOrder(DIRECTOR)).toBe(true);
    expect(canCreateSupplierOrder(MANAGER)).toBe(false);
    expect(canCreateSupplierOrder(ADMIN_ONLY)).toBe(false);
  });

  it('exposes confirm-ready as a dedicated action before confirmation', () => {
    expect(
      getSupplierOrderActions({
        status: 'IN_PRODUCTION',
        permissions: HEAD,
      }),
    ).toContain('confirm-ready');
    expect(
      getSupplierOrderActions({
        status: 'READY_FOR_SHIPMENT',
        readyConfirmedAt: '2026-08-20T10:00:00.000Z',
        permissions: HEAD,
      }),
    ).not.toContain('confirm-ready');
  });

  it('lets HEAD/DIRECTOR ship after ready and MANAGER confirm client delivery after SHIPPED', () => {
    expect(
      getSupplierOrderActions({
        status: 'READY_FOR_SHIPMENT',
        readyConfirmedAt: '2026-08-20T10:00:00.000Z',
        permissions: HEAD,
      }),
    ).toEqual(['edit-dates', 'ship']);
    expect(
      getSupplierOrderActions({
        status: 'READY_FOR_SHIPMENT',
        permissions: MANAGER,
      }),
    ).toEqual([]);
    expect(
      getSupplierOrderActions({
        status: 'SHIPPED',
        permissions: MANAGER,
      }),
    ).toEqual(['confirm-client-delivery']);
    expect(
      getSupplierOrderActions({
        status: 'SHIPPED',
        permissions: DIRECTOR,
      }),
    ).toContain('confirm-client-delivery');
    expect(
      getSupplierOrderActions({
        status: 'DELIVERED',
        permissions: HEAD,
      }),
    ).toEqual([]);
    expect(
      getSupplierOrderActions({
        status: 'SHIPPED',
        permissions: ADMIN_ONLY,
      }),
    ).toEqual([]);
  });
});
