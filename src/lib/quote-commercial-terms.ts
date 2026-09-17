import { ru } from '@/i18n/ru';
import { getActiveMessages } from '@/i18n/active-messages';
import type { Messages } from '@/i18n/types';
import { dateInputToIso, formatDate, toDateInputValue } from './format';

export const COMMERCIAL_TERMS_SECTION_LABEL = ru.quotes.commercialTerms;
export const PRODUCTION_PERIOD_LABEL = ru.quotes.productionTerms;
export const DELIVERY_PERIOD_LABEL = ru.quotes.deliveryTerms;
export const VALID_UNTIL_LABEL = ru.quotes.validUntil;
export const DOCUMENT_DATE_LABEL = ru.quotes.documentDate;
export const COMMERCIAL_NOTE_LABEL = ru.quotes.commercialNote;
export const CONVERT_TO_QUOTE_LABEL = ru.quotes.convertToQuote;

export const DEFAULT_QUOTE_VALIDITY_DAYS = 14;

export const DAY_RANGE_REQUIRED_MESSAGE = ru.validation.dayRangeRequired;
export const PRODUCTION_REQUIRED_MESSAGE = ru.validation.productionRequired;
export const DELIVERY_REQUIRED_MESSAGE = ru.validation.deliveryRequired;
export const DAY_RANGE_ORDER_MESSAGE = ru.validation.dayRangeOrder;
export const VALID_UNTIL_REQUIRED_MESSAGE = ru.validation.validUntilRequired;
export const QUOTE_COMMERCIAL_TERMS_INCOMPLETE =
  'QUOTE_COMMERCIAL_TERMS_INCOMPLETE';

const QUOTES_UPDATE_PERMISSION = 'quotes:update';
const QUOTES_READ_ALL_PERMISSION = 'quotes:read_all';
const QUOTES_APPROVE_PERMISSION = 'quotes:approve';

function hasPermission(
  permissions: readonly string[] | null | undefined,
  slug: string,
): boolean {
  return Boolean(permissions?.includes(slug));
}

/** HEAD owns all client-facing Quote terms. */
export function canEditQuoteClientFacingTerms(
  permissions: readonly string[] | null | undefined,
): boolean {
  return hasPermission(permissions, QUOTES_APPROVE_PERMISSION);
}

/** Quote Примечание is part of the HEAD-owned commercial snapshot. */
export function canEditQuoteCommercialNote(
  permissions: readonly string[] | null | undefined,
): boolean {
  return hasPermission(permissions, QUOTES_APPROVE_PERMISSION);
}

export function canMutateQuoteDraftClientTerms({
  permissions,
  currentUserId,
  managerId,
  status,
  finalizedAt,
}: {
  permissions: readonly string[] | null | undefined;
  currentUserId?: string | null;
  managerId: string;
  status: string;
  finalizedAt?: string | null;
}): boolean {
  if (status !== 'draft' || finalizedAt) {
    return false;
  }

  const isOwner = Boolean(currentUserId && managerId === currentUserId);
  const canWrite =
    hasPermission(permissions, QUOTES_UPDATE_PERMISSION) &&
    (isOwner || hasPermission(permissions, QUOTES_READ_ALL_PERMISSION));

  return canWrite && canEditQuoteClientFacingTerms(permissions);
}

export function quoteAutomaticDate(
  quote: { createdAt: string; documentDate?: string | null },
): string {
  return formatDate(quote.createdAt);
}

export function localDateInputValue(now = new Date()): string {
  return toDateInputValue(now);
}

export function defaultQuoteValidUntilInput(now = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  date.setDate(date.getDate() + DEFAULT_QUOTE_VALIDITY_DAYS);
  return toDateInputValue(date);
}

export function parsePositiveInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const amount = Number(trimmed);
  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

export function validateDayRange(
  from: string,
  to: string,
  messages: Messages = getActiveMessages(),
): string | null {
  const fromDays = parsePositiveInt(from);
  const toDays = parsePositiveInt(to);
  if (fromDays == null || toDays == null) {
    return messages.validation.dayRangeRequired;
  }

  if (fromDays > toDays) {
    return messages.validation.dayRangeOrder;
  }

  return null;
}

export type QuoteCommercialTermsForm = {
  productionTerms?: string;
  deliveryTerms?: string;
  productionDaysFrom?: string;
  productionDaysTo?: string;
  deliveryDaysFrom?: string;
  deliveryDaysTo?: string;
  validUntil: string;
  commercialNote?: string;
  internalCommercialNote?: string;
};

export function isCompleteQuoteDayRange(
  from?: number | string | null,
  to?: number | string | null,
): boolean {
  const fromDays =
    typeof from === 'string' ? parsePositiveInt(from) : from ?? null;
  const toDays = typeof to === 'string' ? parsePositiveInt(to) : to ?? null;
  return (
    fromDays != null &&
    toDays != null &&
    fromDays > 0 &&
    toDays > 0 &&
    fromDays <= toDays
  );
}

export function quoteCustomerDocumentIssues(
  quote: {
    productionTerms?: string | null;
    deliveryTerms?: string | null;
    productionDaysFrom?: number | null;
    productionDaysTo?: number | null;
    deliveryDaysFrom?: number | null;
    deliveryDaysTo?: number | null;
  },
  messages: Messages = getActiveMessages(),
): string[] {
  const issues: string[] = [];
  if (
    !quote.productionTerms?.trim() &&
    !isCompleteQuoteDayRange(quote.productionDaysFrom, quote.productionDaysTo)
  ) {
    issues.push(messages.validation.productionRequired);
  }
  if (
    !quote.deliveryTerms?.trim() &&
    !isCompleteQuoteDayRange(quote.deliveryDaysFrom, quote.deliveryDaysTo)
  ) {
    issues.push(messages.validation.deliveryRequired);
  }
  return issues;
}

export function hasCompleteQuoteClientTerms(quote: {
  productionTerms?: string | null;
  deliveryTerms?: string | null;
  productionDaysFrom?: number | null;
  productionDaysTo?: number | null;
  deliveryDaysFrom?: number | null;
  deliveryDaysTo?: number | null;
}): boolean {
  return quoteCustomerDocumentIssues(quote).length === 0;
}

export function validateQuoteCommercialTerms(
  form: QuoteCommercialTermsForm,
  messages: Messages = getActiveMessages(),
): string | null {
  if (!form.productionTerms?.trim()) {
    return messages.validation.productionRequired;
  }
  if (!form.deliveryTerms?.trim()) {
    return messages.validation.deliveryRequired;
  }

  if (!form.validUntil.trim()) {
    return messages.validation.validUntilRequired;
  }

  return null;
}

export function buildQuoteCommercialTermsPayload(
  form: QuoteCommercialTermsForm,
  options?: { includeNote?: boolean },
): {
  validUntil?: string;
  commercialNote?: string;
  internalCommercialNote?: string;
  productionTerms?: string;
  deliveryTerms?: string;
} {
  const includeNote = options?.includeNote === true;
  const note = form.commercialNote?.trim();
  const productionText = form.productionTerms?.trim();
  const deliveryText = form.deliveryTerms?.trim();

  return {
    validUntil: dateInputToIso(form.validUntil),
    ...(includeNote ? { commercialNote: note || '' } : {}),
    ...(productionText ? { productionTerms: productionText } : {}),
    ...(deliveryText ? { deliveryTerms: deliveryText } : {}),
    ...(includeNote
      ? { internalCommercialNote: form.internalCommercialNote?.trim() || '' }
      : {}),
  };
}
