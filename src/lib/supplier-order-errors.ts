import { AxiosError } from 'axios';
import { ru } from '@/i18n/ru';
import { getActiveMessages } from '@/i18n/active-messages';
import type { Messages } from '@/i18n/types';

export const CLIENT_ACCEPTANCE_REQUIRED_MESSAGE =
  ru.errors.clientAcceptanceRequired;

export const SHIPMENT_PAYMENT_REQUIRED_MESSAGE =
  ru.errors.shipmentPaymentRequired;

export const CLIENT_DELIVERY_NOT_SHIPPED_MESSAGE =
  ru.errors.clientDeliveryNotShipped;

export const SUPPLIER_ORDER_FORBIDDEN_MESSAGE = ru.errors.supplierOrderForbidden;

export const SUPPLIER_ORDER_STALE_STATE_MESSAGE = ru.errors.supplierOrderStale;

export const SUPPLIER_ORDER_QUOTE_REQUIRED_MESSAGE =
  ru.errors.supplierOrderQuoteRequired;

export const WAREHOUSE_STOCK_SUPPLIER_ORDER_MESSAGE =
  ru.errors.warehouseStockSupplierOrder;

export const FULFILLMENT_SOURCE_REQUIRED_MESSAGE =
  ru.errors.fulfillmentSourceRequired;

function exactMessageMap(messages: Messages): Record<string, string> {
  return {
    'Supplier order requires an internally approved Quote with recorded client acceptance':
      messages.errors.clientAcceptanceRequired,
    'Supplier order requires an HPL Deal with an originating Quote':
      messages.errors.supplierOrderQuoteRequired,
    'Delivery blocked because required payment is not confirmed':
      messages.errors.shipmentPaymentRequired,
    'Client delivery can be confirmed only after the supplier order is shipped':
      messages.errors.clientDeliveryNotShipped,
    'Cannot confirm client delivery for a cancelled supplier order':
      messages.errors.cancelledDeliveryConfirm,
    'Supplier shipment is allowed only for HEAD or DIRECTOR':
      messages.errors.supplierOrderForbidden,
    'Client delivery may be confirmed only by MANAGER, HEAD, or DIRECTOR':
      messages.errors.supplierOrderForbidden,
    'Warehouse-stock Deal cannot create supplier orders':
      messages.errors.warehouseStockSupplierOrder,
    'Deal fulfillment source must be selected before supplier ordering':
      messages.errors.fulfillmentSourceRequired,
    'Supplier order status changed concurrently':
      messages.errors.supplierOrderStale,
    'Supplier order readiness was not confirmed':
      messages.errors.supplierOrderStale,
    'Client delivery was not confirmed': messages.errors.supplierOrderStale,
  };
}

function codeMessageMap(messages: Messages): Record<string, string> {
  return {
    FULFILLMENT_SOURCE_CONFLICT: messages.errors.warehouseStockSupplierOrder,
    FULFILLMENT_SOURCE_REQUIRED: messages.errors.fulfillmentSourceRequired,
  };
}

const CODE_MESSAGE_MAP = codeMessageMap(ru);

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

export function localizeSupplierOrderError(
  error: unknown,
  messages: Messages = getActiveMessages(),
): string | null {
  const exact = exactMessageMap(messages);
  const codes = codeMessageMap(messages);
  const { tokens } = collectTokens(error);

  for (const token of tokens) {
    if (exact[token]) {
      return exact[token];
    }
    if (codes[token]) {
      return codes[token];
    }
  }

  const joined = tokens.join(' ');
  if (looksLikeMissingClientAcceptance(joined)) {
    return messages.errors.clientAcceptanceRequired;
  }
  if (looksLikePaymentGate(joined)) {
    return messages.errors.shipmentPaymentRequired;
  }

  if (joined.toLowerCase().includes('cannot confirm readiness')) {
    return messages.errors.cannotConfirmReadiness;
  }
  if (joined.toLowerCase().includes('cannot change planned dates')) {
    return messages.errors.cannotChangePlannedDates;
  }
  if (joined.toLowerCase().includes('cannot change supplier order from')) {
    return messages.errors.supplierOrderStale;
  }
  if (joined.toLowerCase().includes('expectedreadyat must not precede')) {
    return messages.errors.readyBeforeOrder;
  }
  if (joined.toLowerCase().includes('expectedshipmentat must not precede')) {
    return messages.errors.shipmentBeforeReady;
  }
  if (joined.toLowerCase().includes('expectedarrivalat must not precede')) {
    return messages.errors.arrivalBeforeShipment;
  }

  return null;
}

export function getSupplierOrderErrorMessage(
  error: unknown,
  messages: Messages = getActiveMessages(),
): string {
  const localized = localizeSupplierOrderError(error, messages);
  if (localized) {
    return localized;
  }

  if (error instanceof AxiosError) {
    if (error.response?.status === 403) {
      return messages.errors.supplierOrderForbidden;
    }
    if (error.response?.status === 409) {
      return messages.errors.supplierOrderStale;
    }
  }

  const { tokens } = collectTokens(error);
  const first = tokens.find((token) => token && !CODE_MESSAGE_MAP[token]);
  return first || messages.errors.supplierOrderFailed;
}
