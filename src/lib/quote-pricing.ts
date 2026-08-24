import type { CommercialCurrencyCode, Quote, QuoteItem } from '@/types/hpl';
import type { MoneyCurrency } from '@/lib/currency';

export const COMMERCIAL_CURRENCY_CODES: CommercialCurrencyCode[] = [
  'USD',
  'UZS',
];

export const REFERENCE_PRICE_LABEL = 'Закупочная цена, CNY/м²';
export const APPROVED_PRICE_LABEL = 'Расчётная цена, USD/м²';
export const PRICE_NOT_APPROVED_LABEL = 'Не утверждено';
export const PRICE_APPROVED_LABEL = 'Утверждено';
export const FINALIZE_QUOTE_LABEL = 'Сформировать КП';
export const APPROVE_PRICES_LABEL = 'Подтвердить рассчитанные цены';
export const CALCULATE_PRICES_LABEL = 'Рассчитать';
export const QUOTE_FINALIZED_LABEL = 'КП финализировано';
export const MIXED_CURRENCY_TOTAL_HINT =
  'В КП разные валюты — общий итог не складывается';

export type ApprovedPricingItemPayload = {
  id: string;
  purchasePricePerM2Cny: string;
};

export function isQuoteFinalized(
  quote?: Pick<Quote, 'finalizedAt'> | null,
): boolean {
  return Boolean(quote?.finalizedAt);
}

export function isQuotePriceApproved(
  item?: Pick<QuoteItem, 'priceApprovedAt'> | null,
): boolean {
  return Boolean(item?.priceApprovedAt);
}

export function parseCommercialCurrency(
  value?: string | null,
): CommercialCurrencyCode | null {
  const code = value?.trim().toUpperCase();
  if (code === 'USD' || code === 'UZS') {
    return code;
  }

  return null;
}

export function quoteItemCurrencies(quote: Pick<Quote, 'items'>): string[] {
  const codes = new Set<string>();
  for (const item of quote.items) {
    const code = parseCommercialCurrency(item.currencyCode);
    if (code) {
      codes.add(code);
    }
  }
  return [...codes];
}

export function quoteUsesMixedCurrencies(quote: Pick<Quote, 'items'>): boolean {
  return quoteItemCurrencies(quote).length > 1;
}

export function quoteDisplayCurrency(
  quote: Pick<Quote, 'items' | 'displayCurrency'>,
): MoneyCurrency | null {
  if (quoteUsesMixedCurrencies(quote)) {
    return null;
  }

  const fromItems = parseCommercialCurrency(quoteItemCurrencies(quote)[0]);
  if (fromItems) {
    return fromItems;
  }

  return parseCommercialCurrency(quote.displayCurrency);
}

export function unapprovedQuoteItemIds(
  quote: Pick<Quote, 'items'>,
): string[] {
  return quote.items
    .filter((item) => !isQuotePriceApproved(item))
    .map((item) => item.id);
}

export function canFinalizeQuoteItems(quote: Pick<Quote, 'items'>): boolean {
  if (quote.items.length === 0) {
    return false;
  }

  return quote.items.every(
    (item) =>
      isQuotePriceApproved(item) &&
      parseCommercialCurrency(item.currencyCode) != null,
  );
}

export function validateApprovedPricingItem(item: {
  purchasePricePerM2Cny: string;
}): string | null {
  const amount = item.purchasePricePerM2Cny.trim().replace(',', '.');
  if (!/^(?:\d+)(?:\.\d{1,4})?$/.test(amount) || Number(amount) <= 0) {
    return 'Укажите закупочную цену CNY/м² больше 0';
  }

  return null;
}

export function serializeApprovedPricePerM2(value: string): string {
  const trimmed = value.trim().replace(',', '.');
  const match = trimmed.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) {
    return trimmed;
  }
  const fraction = (match[2] ?? '').slice(0, 4);
  return fraction ? `${match[1]}.${fraction}` : match[1];
}

export function buildApprovedPricingPayload(
  items: Array<{ id: string; purchasePricePerM2Cny: string }>,
): { items: ApprovedPricingItemPayload[] } {
  return {
    items: items
      .filter((item) => item.purchasePricePerM2Cny.trim())
      .map((item) => ({
        id: item.id,
        purchasePricePerM2Cny: serializeApprovedPricePerM2(
          item.purchasePricePerM2Cny,
        ),
      })),
  };
}

export function canDownloadQuoteDocument(
  quote?: Pick<Quote, 'finalizedAt' | 'pdfFileId' | 'status' | 'documentAvailability'> | null,
  permissions: readonly string[] | null | undefined = [],
): boolean {
  if (
    quote?.documentAvailability === 'LEGACY_MISSING' ||
    (quote?.status === 'converted' && !quote.pdfFileId)
  ) {
    return false;
  }
  if (isQuoteFinalized(quote)) {
    return true;
  }

  return Boolean(permissions?.includes('quotes:approve'));
}
