'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/currency';
import { formatDateTime } from '@/lib/format';
import { quoteItemGroupTitle, quoteItemTitle } from '@/lib/quote-presentation';
import {
  APPROVE_PRICES_LABEL,
  CALCULATE_PRICES_LABEL,
  FINALIZE_QUOTE_LABEL,
  PRICE_APPROVED_LABEL,
  PRICE_NOT_APPROVED_LABEL,
  QUOTE_FINALIZED_LABEL,
  REFERENCE_PRICE_LABEL,
  APPROVED_PRICE_LABEL,
  buildApprovedPricingPayload,
  canFinalizeQuoteItems,
  isQuoteFinalized,
  isQuotePriceApproved,
  parseCommercialCurrency,
  validateApprovedPricingItem,
} from '@/lib/quote-pricing';
import type { Quote, QuotePricingPreview } from '@/types/hpl';
import type { ApprovedPricingItemPayload } from '@/lib/quote-pricing';

type QuoteApprovedPricingProps = {
  quote: Quote;
  canApprove: boolean;
  canFinalize: boolean;
  highlightUnapproved?: boolean;
  pricingPending?: boolean;
  previewPending?: boolean;
  finalizePending?: boolean;
  onPreview: (
    items: ApprovedPricingItemPayload[],
  ) => Promise<QuotePricingPreview>;
  onApprove: (items: ApprovedPricingItemPayload[]) => Promise<unknown> | unknown;
  onFinalize: () => Promise<unknown> | unknown;
};

type DraftItem = { id: string; purchasePricePerM2Cny: string };

function draftsFromQuote(quote: Quote): DraftItem[] {
  return quote.items.map((item) => ({
    id: item.id,
    purchasePricePerM2Cny:
      item.supplierPricePerM2 != null && item.supplierPricePerM2 !== ''
        ? String(item.supplierPricePerM2)
        : '',
  }));
}

export function QuoteApprovedPricing({
  quote,
  canApprove,
  canFinalize,
  highlightUnapproved = false,
  pricingPending = false,
  previewPending = false,
  finalizePending = false,
  onPreview,
  onApprove,
  onFinalize,
}: QuoteApprovedPricingProps) {
  const locked = isQuoteFinalized(quote);
  const quoteKey = `${quote.id}:${quote.updatedAt}:${quote.items
    .map((item) => `${item.id}:${item.supplierPricePerM2 ?? ''}:${item.priceApprovedAt ?? ''}`)
    .join('|')}`;
  const [drafts, setDrafts] = useState<DraftItem[]>(() => draftsFromQuote(quote));
  const [syncedKey, setSyncedKey] = useState(quoteKey);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<QuotePricingPreview | null>(null);

  if (syncedKey !== quoteKey) {
    setSyncedKey(quoteKey);
    setDrafts(draftsFromQuote(quote));
    setRowErrors({});
    setPreview(null);
  }

  const validateAndBuild = (): ApprovedPricingItemPayload[] | null => {
    const nextErrors: Record<string, string> = {};
    for (const draft of drafts) {
      const error = validateApprovedPricingItem(draft);
      if (error) nextErrors[draft.id] = error;
    }
    setRowErrors(nextErrors);
    return Object.keys(nextErrors).length > 0
      ? null
      : buildApprovedPricingPayload(drafts).items;
  };

  const calculate = async (): Promise<void> => {
    const items = validateAndBuild();
    if (items) setPreview(await onPreview(items));
  };

  const approve = async (): Promise<void> => {
    const items = validateAndBuild();
    if (items && preview) await onApprove(items);
  };

  const finalizeGuarded = canFinalizeQuoteItems(quote);

  return (
    <section className="space-y-3 border-b border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Расчёт коммерческих цен</h4>
        {locked ? (
          <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            {QUOTE_FINALIZED_LABEL}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-slate-500">
        HEAD указывает закупочную цену в CNY/м². Backend рассчитывает цену в USD
        по активному курсу CNY→USD и коэффициенту 2.0. Расчёт нужно подтвердить отдельно.
      </p>
      {preview ? (
        <p className="text-xs text-slate-600">
          Курс CNY→USD: {String(preview.cnyUsdRate)} · коэффициент:{' '}
          {String(preview.sellingCoefficient)}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-slate-600">
              <th className="px-2 py-2">Позиция</th>
              <th className="px-2 py-2">Поставщик</th>
              <th className="px-2 py-2">{REFERENCE_PRICE_LABEL}</th>
              <th className="px-2 py-2">{APPROVED_PRICE_LABEL}</th>
              <th className="px-2 py-2">Статус</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item) => {
              const draft = drafts.find((entry) => entry.id === item.id);
              const previewItem = preview?.items.find((entry) => entry.id === item.id);
              const approved = isQuotePriceApproved(item);
              const groupTitle = quoteItemGroupTitle(item);
              const snapshotPurchasePrice =
                item.supplierPricePerM2 == null
                  ? ''
                  : String(item.supplierPricePerM2);
              const snapshotMatchesInput =
                (draft?.purchasePricePerM2Cny ?? '').replace(',', '.') ===
                snapshotPurchasePrice.replace(',', '.');
              const calculatedPrice =
                previewItem?.pricePerM2 ??
                (snapshotMatchesInput ? item.pricePerM2 : null);
              const calculatedCurrency = previewItem
                ? 'USD'
                : parseCommercialCurrency(item.currencyCode) ?? 'USD';
              return (
                <tr
                  key={item.id}
                  className={highlightUnapproved && !approved ? 'bg-red-50' : undefined}
                >
                  <td className="px-2 py-2 font-medium text-slate-900">
                    {quoteItemTitle(item)}
                    {groupTitle ? (
                      <div className="text-xs font-normal text-slate-500">{groupTitle}</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {item.supplierName ?? item.supplierCode ?? '—'}
                  </td>
                  <td className="px-2 py-2">
                    {canApprove && !locked ? (
                      <input
                        aria-label={`${REFERENCE_PRICE_LABEL} ${quoteItemTitle(item)}`}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        inputMode="decimal"
                        value={draft?.purchasePricePerM2Cny ?? ''}
                        onChange={(event) => {
                          setPreview(null);
                          setDrafts((current) =>
                            current.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, purchasePricePerM2Cny: event.target.value }
                                : entry,
                            ),
                          );
                        }}
                      />
                    ) : item.supplierPricePerM2 != null ? (
                      `${String(item.supplierPricePerM2)} CNY/м²`
                    ) : (
                      '—'
                    )}
                    {rowErrors[item.id] ? (
                      <p className="mt-1 text-xs text-red-600">{rowErrors[item.id]}</p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {calculatedPrice != null && calculatedPrice !== ''
                      ? formatMoney(calculatedPrice, calculatedCurrency)
                      : 'Недоступна'}
                  </td>
                  <td className="px-2 py-2">
                    {approved ? (
                      <span className="text-emerald-700">
                        {PRICE_APPROVED_LABEL}
                        {item.priceApprovedAt
                          ? ` · ${formatDateTime(item.priceApprovedAt)}`
                          : ''}
                      </span>
                    ) : (
                      <span className="text-amber-700">{PRICE_NOT_APPROVED_LABEL}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canApprove && !locked ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={previewPending || pricingPending || finalizePending}
            onClick={() => void calculate()}
          >
            {previewPending ? 'Расчёт...' : CALCULATE_PRICES_LABEL}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!preview || previewPending || pricingPending || finalizePending}
            onClick={() => void approve()}
          >
            {pricingPending ? 'Подтверждение...' : APPROVE_PRICES_LABEL}
          </Button>
          {canFinalize ? (
            <Button
              type="button"
              disabled={!finalizeGuarded || pricingPending || finalizePending}
              title={
                finalizeGuarded
                  ? undefined
                  : 'Сначала явно подтвердите рассчитанную цену по каждой позиции'
              }
              onClick={() => void onFinalize()}
            >
              {finalizePending ? 'Формирование...' : FINALIZE_QUOTE_LABEL}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
