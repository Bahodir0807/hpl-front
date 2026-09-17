import { AxiosError } from 'axios';
import { ru } from '@/i18n/ru';
import { getActiveMessages } from '@/i18n/active-messages';
import type { Messages } from '@/i18n/types';

export const PRICING_NOT_CONFIGURED_MESSAGE = ru.errors.pricingNotConfigured;

export const CUSTOM_SIZE_PRICING_NOT_CONFIGURED_MESSAGE =
  ru.errors.customSizePricingNotConfigured;

export const CURRENCY_RATE_MISSING_MESSAGE = ru.errors.currencyRateMissing;

export const QUOTE_APPROVAL_FORBIDDEN_MESSAGE =
  ru.errors.quoteApprovalForbidden;

export const QUOTE_PRICE_NOT_APPROVED_MESSAGE = ru.errors.quotePriceNotApproved;

export const QUOTE_TERMS_LOCKED_MESSAGE = ru.errors.quoteTermsLocked;

export const QUOTE_APPROVAL_FORBIDDEN = 'QUOTE_APPROVAL_FORBIDDEN';
export const QUOTE_PRICE_NOT_APPROVED = 'QUOTE_PRICE_NOT_APPROVED';
export const QUOTE_TERMS_LOCKED = 'QUOTE_TERMS_LOCKED';
export const QUOTE_ALREADY_EXISTS = 'QUOTE_ALREADY_EXISTS';
export const QUOTE_SUPPLIER_REQUIRED = 'QUOTE_SUPPLIER_REQUIRED';
export const QUOTE_SUPPLIER_REQUIRED_MESSAGE = ru.errors.quoteSupplierRequired;

export function getCodedHplErrors(messages: Messages = getActiveMessages()): Record<string, string> {
  return {
    PRICING_NOT_CONFIGURED: messages.errors.pricingNotConfigured,
    CUSTOM_SIZE_PRICING_NOT_CONFIGURED:
      messages.errors.customSizePricingNotConfigured,
    PURCHASE_PRICE_REQUIRED: messages.errors.purchasePriceRequired,
    MANUAL_PURCHASE_PRICE_FORBIDDEN:
      messages.errors.manualPurchasePriceForbidden,
    INVALID_SUPPLIER_PRICE: messages.errors.invalidSupplierPrice,
    CURRENCY_RATE_MISSING: messages.errors.currencyRateMissing,
    CURRENCY_RATE_NOT_CONFIGURED: messages.errors.currencyRateMissing,
    CURRENCY_RATE_NOT_FOUND: messages.errors.currencyRateMissing,
    NO_ACTIVE_CURRENCY_RATE: messages.errors.currencyRateMissing,
    FX_RATE_MISSING: messages.errors.currencyRateMissing,
    FX_RATE_NOT_CONFIGURED: messages.errors.currencyRateMissing,
    CNY_USD_RATE_MISSING: messages.errors.currencyRateMissing,
    INVALID_CURRENCY_RATE: messages.errors.invalidCurrencyRate,
    [QUOTE_APPROVAL_FORBIDDEN]: messages.errors.quoteApprovalForbidden,
    [QUOTE_PRICE_NOT_APPROVED]: messages.errors.quotePriceNotApproved,
    [QUOTE_TERMS_LOCKED]: messages.errors.quoteTermsLocked,
    CALCULATION_REQUEST_LOCKED: messages.errors.calculationRequestLocked,
    [QUOTE_ALREADY_EXISTS]: messages.errors.quoteAlreadyExists,
    [QUOTE_SUPPLIER_REQUIRED]: messages.errors.quoteSupplierRequired,
    QUOTE_PDF_NOT_FINALIZED: messages.errors.quotePdfNotFinalized,
    INVALID_QUANTITY: messages.errors.invalidQuantity,
  };
}

const CODED_HPL_ERRORS = getCodedHplErrors();

export function createApiErrorFromPayload(
  payload: unknown,
  fallback = getActiveMessages().errors.server,
): AxiosError {
  const data =
    payload && typeof payload === 'object'
      ? payload
      : { message: typeof payload === 'string' ? payload : fallback };

  return new AxiosError(
    fallback,
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} } as never,
      data,
    },
  );
}

function isBlobLike(value: unknown): value is Blob {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { text?: unknown }).text === 'function'
  );
}

export async function materializeAxiosError(error: unknown): Promise<unknown> {
  if (!(error instanceof AxiosError) || !error.response) {
    return error;
  }

  const data = error.response.data;
  if (!isBlobLike(data)) {
    return error;
  }

  const text = await data.text();
  try {
    error.response.data = JSON.parse(text) as typeof error.response.data;
  } catch {
    error.response.data = { message: text };
  }

  return error;
}

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

function collectErrorTokens(error: unknown): string[] {
  const tokens: string[] = [];

  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && !isBlobLike(data)) {
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

  return tokens;
}

function lookupCodedMessage(
  token: string,
  codedErrors: Record<string, string> = CODED_HPL_ERRORS,
): string | null {
  const compact = token.trim();
  if (codedErrors[compact]) {
    return codedErrors[compact];
  }

  const upper = compact.toUpperCase().replace(/[\s-]+/g, '_');
  for (const [code, message] of Object.entries(codedErrors)) {
    if (upper === code || upper.includes(code)) {
      return message;
    }
  }

  return null;
}

function looksLikeMissingFx(text: string): boolean {
  const normalized = text.toLowerCase();
  const mentionsRate =
    normalized.includes('currency rate') ||
    normalized.includes('fx') ||
    normalized.includes('курс') ||
    normalized.includes('exchange rate');
  const mentionsPair =
    (normalized.includes('cny') && normalized.includes('usd')) ||
    normalized.includes('cny') ||
    normalized.includes('currency');
  const mentionsMissing =
    normalized.includes('missing') ||
    normalized.includes('not configured') ||
    normalized.includes('not found') ||
    normalized.includes('no active') ||
    normalized.includes('не установлен') ||
    normalized.includes('отсутств');

  return mentionsRate && mentionsPair && mentionsMissing;
}

export function getApiErrorCode(error: unknown): string | null {
  const tokens = collectErrorTokens(error);
  for (const token of tokens) {
    const compact = token.trim();
    if (CODED_HPL_ERRORS[compact]) {
      return compact;
    }

    const upper = compact.toUpperCase().replace(/[\s-]+/g, '_');
    for (const code of Object.keys(CODED_HPL_ERRORS)) {
      if (upper === code || upper.includes(code)) {
        return code;
      }
    }
  }

  return null;
}

export function localizeHplBusinessError(
  error: unknown,
  messages: Messages = getActiveMessages(),
): string | null {
  const codedErrors = getCodedHplErrors(messages);
  const tokens = collectErrorTokens(error);
  for (const token of tokens) {
    const coded = lookupCodedMessage(token, codedErrors);
    if (coded) {
      return coded;
    }
  }

  const joined = tokens.join(' ');
  if (looksLikeMissingFx(joined)) {
    return messages.errors.currencyRateMissing;
  }
  if (
    joined.toLowerCase().includes('currency rate') &&
    (joined.toLowerCase().includes('greater') ||
      joined.toLowerCase().includes('positive') ||
      joined.includes('должен быть больше'))
  ) {
    return messages.errors.invalidCurrencyRate;
  }
  if (
    joined.toLowerCase().includes('comment is required for other') ||
    joined.toLowerCase().includes('other loss reason')
  ) {
    return messages.errors.otherLossComment;
  }
  if (joined.toLowerCase().includes('received quantity exceeds expected')) {
    return messages.errors.receivedExceedsExpected;
  }

  return null;
}
