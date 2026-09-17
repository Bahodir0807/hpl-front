import type {
  ClientSegment,
  ClientStatus,
  ClientType,
} from '@/hooks/use-clients';
import type { DealStage } from '@/hooks/use-deals';
import type {
  ExpectedReceiptStatus,
  ProductStatus,
} from '@/hooks/use-inventory';
import type { LeadStatus } from '@/hooks/use-leads';
import type {
  DeliveryStatus,
  OrderStatus,
  PaymentRecordStatus,
  PaymentStatus,
} from '@/hooks/use-orders';
import type {
  TaskComputedStatus,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@/hooks/use-tasks';
import type { RoleName } from '@/hooks/use-users';
import type { SupplierCode } from '@/types/hpl';
import { getActiveMessages } from '@/i18n/active-messages';
import { localizeSystemText } from '@/i18n/system-labels';
import { ru } from '@/i18n/ru';

export const taskStatusLabels: Record<TaskStatus, string> = {
  ...ru.statuses.task,
};

export const taskComputedStatusLabels: Record<TaskComputedStatus, string> = {
  ...ru.statuses.taskComputed,
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  ...ru.statuses.taskPriority,
};

export const taskTypeLabels: Record<TaskType, string> = {
  ...ru.statuses.taskType,
};

export const dealStageLabels: Record<DealStage, string> = {
  ...ru.statuses.dealStage,
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  ...ru.statuses.order,
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  ...ru.statuses.payment,
};

export const paymentRecordStatusLabels: Record<PaymentRecordStatus, string> = {
  ...ru.statuses.paymentRecord,
};

export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  ...ru.statuses.delivery,
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  ...ru.statuses.lead,
};

export const clientStatusLabels: Record<ClientStatus, string> = {
  ...ru.statuses.client,
};

export const clientTypeLabels: Record<ClientType, string> = {
  ...ru.statuses.clientType,
};

export const clientSegmentLabels: Record<ClientSegment, string> = {
  ...ru.statuses.clientSegment,
};

export const productStatusLabels: Record<ProductStatus, string> = {
  ...ru.statuses.product,
};

export const expectedReceiptStatusLabels: Record<ExpectedReceiptStatus, string> =
  {
    ...ru.statuses.expectedReceipt,
  };

export const roleLabels: Record<RoleName, string> = {
  ...ru.roles,
};

export const CANONICAL_ROLES: RoleName[] = [
  'ADMIN',
  'DIRECTOR',
  'HEAD',
  'MANAGER',
  'ACCOUNTANT',
  'STOREKEEPER',
];

export const ADMIN_PROVISIONABLE_ROLES: RoleName[] = [...CANONICAL_ROLES];

/** Roles whose password cannot be reset through the user-administration UI/API. */
export const ADMIN_PROTECTED_ASSIGNMENT_ROLES: RoleName[] = [
  'DIRECTOR',
  'HEAD',
  'ACCOUNTANT',
];

export const relatedTypeLabels: Record<string, string> = {
  lead: ru.relatedTypes.lead,
  Lead: ru.relatedTypes.lead,
  deal: ru.relatedTypes.deal,
  Deal: ru.relatedTypes.deal,
  client: ru.relatedTypes.client,
  Client: ru.relatedTypes.client,
  order: ru.relatedTypes.order,
  Order: ru.relatedTypes.order,
  supplierOrder: ru.relatedTypes.supplierOrder,
  SupplierOrder: ru.relatedTypes.supplierOrder,
  DealInstallation: ru.relatedTypes.dealInstallation,
  dealInstallation: ru.relatedTypes.dealInstallation,
  LeadRecovery: ru.relatedTypes.leadRecovery,
  DealRecovery: ru.relatedTypes.dealRecovery,
  task: ru.relatedTypes.task,
};

export function enumLabel(
  labels: Record<string, string>,
  value: string | null | undefined,
): string {
  if (!value) {
    return getActiveMessages().common.dash;
  }

  if (labels[value]) {
    return labels[value];
  }

  const compact = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (labels[compact]) {
    return labels[compact];
  }

  return localizeSystemText(value);
}

export const supplierDisplayNames: Record<SupplierCode, string> = {
  wuya: ru.suppliers.wuya,
  tianran: ru.suppliers.tianran,
  polybet: ru.suppliers.polybet,
};

const LEGACY_WUYA_DISPLAY_NAMES = new Set([
  'буя',
  'buya',
  'wuya',
]);

function activeSupplierDisplayNames(): Record<SupplierCode, string> {
  const suppliers = getActiveMessages().suppliers;
  return {
    wuya: suppliers.wuya,
    tianran: suppliers.tianran,
    polybet: suppliers.polybet,
  };
}

export function formatSupplierName(
  code?: string | null,
  name?: string | null,
  fallback: string = getActiveMessages().suppliers.fallback,
  displayNames: Record<SupplierCode, string> = activeSupplierDisplayNames(),
): string {
  const normalized = code?.trim().toLowerCase();
  if (normalized && normalized in displayNames) {
    return displayNames[normalized as SupplierCode];
  }

  const trimmed = name?.trim();
  if (!trimmed) {
    return fallback;
  }

  if (LEGACY_WUYA_DISPLAY_NAMES.has(trimmed.toLowerCase())) {
    return displayNames.wuya;
  }

  return trimmed;
}
