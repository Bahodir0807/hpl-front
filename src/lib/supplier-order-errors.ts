import { AxiosError } from 'axios';

export const CLIENT_ACCEPTANCE_REQUIRED_MESSAGE =
  'Сначала зафиксируйте согласие клиента на коммерческое предложение.';

export const SHIPMENT_PAYMENT_REQUIRED_MESSAGE =
  'Отгрузка недоступна: заказ ещё не оплачен полностью.';

export const CLIENT_DELIVERY_NOT_SHIPPED_MESSAGE =
  'Подтвердить доставку клиенту можно только после отгрузки.';

export const SUPPLIER_ORDER_FORBIDDEN_MESSAGE =
  'Недостаточно прав для этого действия.';

export const SUPPLIER_ORDER_STALE_STATE_MESSAGE =
  'Состояние заказа поставщику изменилось. Обновите данные и повторите действие.';

export const SUPPLIER_ORDER_QUOTE_REQUIRED_MESSAGE =
  'Заказ поставщику можно создать только по сделке с коммерческим предложением.';

export const WAREHOUSE_STOCK_SUPPLIER_ORDER_MESSAGE =
  'Для складской сделки заказ поставщику недоступен.';

export const FULFILLMENT_SOURCE_REQUIRED_MESSAGE =
  'Сначала выберите источник исполнения сделки.';

const EXACT_MESSAGE_MAP: Record<string, string> = {
  'Supplier order requires an internally approved Quote with recorded client acceptance':
    CLIENT_ACCEPTANCE_REQUIRED_MESSAGE,
  'Supplier order requires an HPL Deal with an originating Quote':
    SUPPLIER_ORDER_QUOTE_REQUIRED_MESSAGE,
  'Delivery blocked because required payment is not confirmed':
    SHIPMENT_PAYMENT_REQUIRED_MESSAGE,
  'Client delivery can be confirmed only after the supplier order is shipped':
    CLIENT_DELIVERY_NOT_SHIPPED_MESSAGE,
  'Cannot confirm client delivery for a cancelled supplier order':
    'Нельзя подтвердить доставку по отменённому заказу поставщику.',
  'Supplier shipment is allowed only for HEAD or DIRECTOR':
    SUPPLIER_ORDER_FORBIDDEN_MESSAGE,
  'Client delivery may be confirmed only by MANAGER, HEAD, or DIRECTOR':
    SUPPLIER_ORDER_FORBIDDEN_MESSAGE,
  'Warehouse-stock Deal cannot create supplier orders':
    WAREHOUSE_STOCK_SUPPLIER_ORDER_MESSAGE,
  'Deal fulfillment source must be selected before supplier ordering':
    FULFILLMENT_SOURCE_REQUIRED_MESSAGE,
  'Supplier order status changed concurrently':
    SUPPLIER_ORDER_STALE_STATE_MESSAGE,
  'Supplier order readiness was not confirmed':
    SUPPLIER_ORDER_STALE_STATE_MESSAGE,
  'Client delivery was not confirmed': SUPPLIER_ORDER_STALE_STATE_MESSAGE,
};

const CODE_MESSAGE_MAP: Record<string, string> = {
  FULFILLMENT_SOURCE_CONFLICT: WAREHOUSE_STOCK_SUPPLIER_ORDER_MESSAGE,
  FULFILLMENT_SOURCE_REQUIRED: FULFILLMENT_SOURCE_REQUIRED_MESSAGE,
};

function pushToken(tokens: string[], value: unknown): void {
  if (typeof value === 'string' && value.trim()) {
    tokens.push(value.trim());
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      pushToken(tokens, item);
    }
  }
}

function collectTokens(error: unknown): { status: number | null; tokens: string[] } {
  const tokens: string[] = [];
  let status: number | null = null;

  if (error instanceof AxiosError) {
    status = error.response?.status ?? null;
    const data = error.response?.data;
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      pushToken(tokens, record.code);
      pushToken(tokens, record.errorCode);
      pushToken(tokens, record.error);
      pushToken(tokens, record.message);
      if (record.error && typeof record.error === 'object') {
        const nested = record.error as Record<string, unknown>;
        pushToken(tokens, nested.code);
        pushToken(tokens, nested.errorCode);
        pushToken(tokens, nested.message);
      }
    } else if (typeof error.message === 'string') {
      tokens.push(error.message);
    }
  } else if (error instanceof Error) {
    tokens.push(error.message);
  } else if (typeof error === 'string') {
    tokens.push(error);
  }

  return { status, tokens };
}

function looksLikeMissingClientAcceptance(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('client acceptance') ||
    normalized.includes('clientacceptedat') ||
    (normalized.includes('supplier order') &&
      normalized.includes('acceptance'))
  );
}

function looksLikePaymentGate(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('payment is not confirmed') ||
    (normalized.includes('delivery blocked') &&
      normalized.includes('payment')) ||
    (normalized.includes('not paid') && normalized.includes('shipment'))
  );
}

export function localizeSupplierOrderError(error: unknown): string | null {
  const { tokens } = collectTokens(error);

  for (const token of tokens) {
    if (EXACT_MESSAGE_MAP[token]) {
      return EXACT_MESSAGE_MAP[token];
    }
    if (CODE_MESSAGE_MAP[token]) {
      return CODE_MESSAGE_MAP[token];
    }
  }

  const joined = tokens.join(' ');
  if (looksLikeMissingClientAcceptance(joined)) {
    return CLIENT_ACCEPTANCE_REQUIRED_MESSAGE;
  }
  if (looksLikePaymentGate(joined)) {
    return SHIPMENT_PAYMENT_REQUIRED_MESSAGE;
  }

  if (joined.toLowerCase().includes('cannot confirm readiness')) {
    return 'Подтвердить готовность в текущем статусе нельзя.';
  }
  if (joined.toLowerCase().includes('cannot change planned dates')) {
    return 'Плановые даты в текущем статусе изменить нельзя.';
  }
  if (joined.toLowerCase().includes('cannot change supplier order from')) {
    return SUPPLIER_ORDER_STALE_STATE_MESSAGE;
  }
  if (joined.toLowerCase().includes('expectedreadyat must not precede')) {
    return 'Дата готовности не может быть раньше даты заказа.';
  }
  if (joined.toLowerCase().includes('expectedshipmentat must not precede')) {
    return 'Дата отгрузки не может быть раньше даты готовности.';
  }
  if (joined.toLowerCase().includes('expectedarrivalat must not precede')) {
    return 'Дата прибытия не может быть раньше даты отгрузки.';
  }

  return null;
}

export function getSupplierOrderErrorMessage(error: unknown): string {
  const localized = localizeSupplierOrderError(error);
  if (localized) {
    return localized;
  }

  if (error instanceof AxiosError) {
    if (error.response?.status === 403) {
      return SUPPLIER_ORDER_FORBIDDEN_MESSAGE;
    }
    if (error.response?.status === 409) {
      return SUPPLIER_ORDER_STALE_STATE_MESSAGE;
    }
  }

  const { tokens } = collectTokens(error);
  const first = tokens.find((token) => token && !CODE_MESSAGE_MAP[token]);
  return first || 'Не удалось выполнить действие с заказом поставщику.';
}
