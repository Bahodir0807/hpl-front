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

export const taskStatusLabels: Record<TaskStatus, string> = {
  PENDING: 'Ожидает',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
};

export const taskComputedStatusLabels: Record<TaskComputedStatus, string> = {
  ON_TIME: 'В срок',
  WARNING: 'Срок приближается',
  TODAY: 'Срок сегодня',
  OVERDUE: 'Просрочена',
  CRITICAL_OVERDUE: 'Критическая просрочка',
  BLOCKED: 'Заблокирована',
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  URGENT: 'Срочный',
};

export const taskTypeLabels: Record<TaskType, string> = {
  FIRST_CONTACT: 'Первый контакт',
  CALL: 'Звонок',
  MESSAGE: 'Сообщение',
  EMAIL: 'Email',
  MEETING: 'Встреча',
  SAMPLE_SEND: 'Образцы',
  CALCULATION: 'Расчет',
  OFFER: 'КП',
  PAYMENT_CHECK: 'Оплата',
  SHIPMENT_CHECK: 'Отгрузка',
  OTHER: 'Другое',
};

// Лейблы совпадают с локальным stageLabels на странице сделок.
export const dealStageLabels: Record<DealStage, string> = {
  QUALIFICATION: 'Квалификация',
  HPL_SELECTION: 'Подбор HPL',
  OFFER_PREPARATION: 'Подготовка КП',
  NEGOTIATION: 'Переговоры',
  AGREEMENT_PENDING: 'Согласование',
  PAYMENT_PREPARATION: 'Подготовка оплаты',
  SHIPPED: 'Отгружено',
  WON: 'Выиграна',
  LOST: 'Проиграна',
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  DRAFT: 'Черновик',
  WAITING_PAYMENT: 'Ожидает оплаты',
  WAITING_STOCK: 'Ожидает товар',
  READY_TO_SHIP: 'Готов к отгрузке',
  PARTIALLY_SHIPPED: 'Частично отгружен',
  SHIPPED: 'Отгружен',
  CANCELLED: 'Отменён',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  UNPAID: 'Не оплачен',
  PARTIALLY_PAID: 'Оплачен частично',
  PAID: 'Оплачен',
};

export const paymentRecordStatusLabels: Record<PaymentRecordStatus, string> = {
  PENDING: 'На проверке',
  CONFIRMED: 'Подтверждён',
  REJECTED: 'Отклонён',
};

export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  PLANNED: 'Запланирована',
  DELIVERED: 'Доставлена',
  CANCELLED: 'Отменена',
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: 'Новый',
  IN_PROGRESS: 'В работе',
  QUALIFIED: 'Квалифицирован',
  UNQUALIFIED: 'Брак',
  CONVERTED: 'Конвертирован',
};

export const clientStatusLabels: Record<ClientStatus, string> = {
  ACTIVE: 'Активный',
  ARCHIVED: 'В архиве',
  BLACKLISTED: 'В чёрном списке',
};

export const clientTypeLabels: Record<ClientType, string> = {
  COMPANY: 'Компания',
  INDIVIDUAL: 'Физлицо',
};

export const clientSegmentLabels: Record<ClientSegment, string> = {
  DEALER: 'Дилер',
  ARCHITECT: 'Архитектор',
  CONTRACTOR: 'Подрядчик',
  END_CUSTOMER: 'Конечный клиент',
  OTHER: 'Другой',
};

export const productStatusLabels: Record<ProductStatus, string> = {
  ACTIVE: 'Активен',
  ARCHIVED: 'В архиве',
  OUT_OF_STOCK: 'Нет в наличии',
};

export const expectedReceiptStatusLabels: Record<ExpectedReceiptStatus, string> =
  {
    PENDING: 'Ожидается',
    PARTIALLY_RECEIVED: 'Частично принят',
    RECEIVED: 'Принят',
    CANCELLED: 'Отменён',
  };

export const roleLabels: Record<RoleName, string> = {
  ADMIN: 'Администратор',
  HEAD: 'Руководитель',
  MANAGER: 'Менеджер',
  STOREKEEPER: 'Кладовщик',
  OBSERVER: 'Наблюдатель',
};

// relatedType приходит от backend строкой, поэтому Record<string, string>.
export const relatedTypeLabels: Record<string, string> = {
  lead: 'Лид',
  deal: 'Сделка',
  client: 'Клиент',
  order: 'Заказ',
  task: 'Задача',
};

export function enumLabel(
  labels: Record<string, string>,
  value: string | null | undefined,
): string {
  if (!value) {
    return '—';
  }

  return labels[value] ?? value;
}

export const supplierDisplayNames: Record<SupplierCode, string> = {
  wuya: 'Буя',
  tianran: 'Тианран',
  polybet: 'Полибет',
};

export function formatSupplierName(
  code?: string | null,
  name?: string | null,
  fallback = 'Поставщик',
): string {
  const normalized = code?.toLowerCase();
  if (normalized && normalized in supplierDisplayNames) {
    return supplierDisplayNames[normalized as SupplierCode];
  }

  const trimmed = name?.trim();
  return trimmed || fallback;
}
