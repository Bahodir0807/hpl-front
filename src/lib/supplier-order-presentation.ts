import type { SupplierOrder, SupplierOrderStatus } from '@/types/hpl';

export const SUPPLIER_ORDERS_MANAGE_PERMISSION = 'supplier_orders:manage';
export const SUPPLIER_ORDERS_CONFIRM_CLIENT_DELIVERY_PERMISSION =
  'supplier_orders:confirm_client_delivery';

export const supplierOrderStatuses: SupplierOrderStatus[] = [
  'DRAFT',
  'SENT_TO_PRODUCTION',
  'IN_PRODUCTION',
  'READY_FOR_SHIPMENT',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export const supplierOrderStatusLabels: Record<SupplierOrderStatus, string> = {
  DRAFT: 'Черновик',
  SENT_TO_PRODUCTION: 'Отправлено в производство',
  IN_PRODUCTION: 'В производстве',
  READY_FOR_SHIPMENT: 'Готов к отгрузке',
  SHIPPED: 'Отгружено',
  DELIVERED: 'Доставлено',
  CANCELLED: 'Отменён',
};

const LEGACY_STATUS_MAP: Record<string, SupplierOrderStatus> = {
  draft: 'DRAFT',
  submitted: 'SENT_TO_PRODUCTION',
  confirmed: 'IN_PRODUCTION',
  in_production: 'IN_PRODUCTION',
  ready_for_shipment: 'READY_FOR_SHIPMENT',
  in_transit: 'SHIPPED',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED',
};

export const READY_CONFIRMABLE_STATUSES: SupplierOrderStatus[] = [
  'DRAFT',
  'SENT_TO_PRODUCTION',
  'IN_PRODUCTION',
  'READY_FOR_SHIPMENT',
];

export type SupplierOrderUiAction =
  | 'edit-dates'
  | 'confirm-ready'
  | 'ship'
  | 'confirm-client-delivery';

export function normalizeSupplierOrderStatus(
  status?: string | null,
): SupplierOrderStatus | null {
  if (!status) {
    return null;
  }

  if (status in supplierOrderStatusLabels) {
    return status as SupplierOrderStatus;
  }

  return LEGACY_STATUS_MAP[status.toLowerCase()] ?? null;
}

export function compactSupplierOrderId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function hasSupplierOrdersManagePermission(
  permissions: readonly string[],
): boolean {
  return permissions.includes(SUPPLIER_ORDERS_MANAGE_PERMISSION);
}

export function hasSupplierOrderClientDeliveryPermission(
  permissions: readonly string[],
): boolean {
  return permissions.includes(
    SUPPLIER_ORDERS_CONFIRM_CLIENT_DELIVERY_PERMISSION,
  );
}

export function canCreateSupplierOrder(
  permissions: readonly string[],
): boolean {
  return hasSupplierOrdersManagePermission(permissions);
}

export function getSupplierOrderActions(input: {
  status?: string | null;
  readyConfirmedAt?: string | null;
  permissions: readonly string[];
}): SupplierOrderUiAction[] {
  const status = normalizeSupplierOrderStatus(input.status);
  const canManage = hasSupplierOrdersManagePermission(input.permissions);
  const canConfirmDelivery = hasSupplierOrderClientDeliveryPermission(
    input.permissions,
  );
  const actions: SupplierOrderUiAction[] = [];

  if (
    canManage &&
    status &&
    status !== 'DELIVERED' &&
    status !== 'CANCELLED'
  ) {
    actions.push('edit-dates');
  }

  if (
    canManage &&
    status &&
    !input.readyConfirmedAt &&
    READY_CONFIRMABLE_STATUSES.includes(status)
  ) {
    actions.push('confirm-ready');
  }

  if (canManage && status === 'READY_FOR_SHIPMENT') {
    actions.push('ship');
  }

  if (canConfirmDelivery && status === 'SHIPPED') {
    actions.push('confirm-client-delivery');
  }

  return actions;
}

export function isCustomerOrderPaid(
  paymentStatus?: string | null,
): boolean {
  return paymentStatus === 'PAID';
}

export function toDateInputValue(
  value?: string | Date | null,
): string {
  if (!value) {
    return '';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateInputToIso(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day).toISOString();
}

export function unwrapSupplierOrderList(
  data: SupplierOrder[] | { items?: SupplierOrder[] } | undefined,
): SupplierOrder[] {
  if (!data) {
    return [];
  }

  return Array.isArray(data) ? data : (data.items ?? []);
}
