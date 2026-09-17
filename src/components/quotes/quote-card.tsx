'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  BriefcaseBusiness,
  Download,
  Send,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney, normalizeCurrency } from '@/lib/currency';
import { dealWorkspaceHref } from '@/lib/entity-routes';
import { formatDate, formatDateTime, formatNumber, toDateInputValue } from '@/lib/format';
import {
  buildQuoteCommercialTermsPayload,
  canEditQuoteCommercialNote,
  canMutateQuoteDraftClientTerms,
  quoteAutomaticDate,
  quoteCustomerDocumentIssues,
  validateQuoteCommercialTerms,
} from '@/lib/quote-commercial-terms';
import {
  compactQuoteId,
  getQuoteActions,
  getQuoteItemDetails,
  QuoteAction,
  QuoteItemDetail,
  quoteItemTitle,
  quoteStatusClassNames,
} from '@/lib/quote-presentation';
import { QuoteApprovedPricing } from '@/components/quotes/quote-approved-pricing';
import type { UpdateQuoteCommercialTermsPayload } from '@/hooks/use-quotes';
import type { Quote, QuotePricingPreview } from '@/types/hpl';
import type { ApprovedPricingItemPayload } from '@/lib/quote-pricing';
import { useI18n } from '@/i18n/provider';
import { useLabelMaps } from '@/i18n/use-label-maps';
import {
  canDownloadQuoteDocument,
  isQuoteFinalized,
  parseCommercialCurrency,
  quoteUsesMixedCurrencies,
} from '@/lib/quote-pricing';

type QuoteCardProps = {
  quote: Quote;
  currentUserId?: string | null;
  permissions: readonly string[];
  managerName?: string;
  isLatest?: boolean;
  conversionAllowed?: boolean;
  pendingAction?: QuoteAction | null;
  onSend: () => void;
  onApprove: () => void;
  onReject: () => void;
  onClientAccept: () => void;
  onConvert: () => void;
  onDownloadPdf?: () => void;
  pdfPending?: boolean;
  onDownloadDocx?: () => void;
  docxPending?: boolean;
  onSaveCommercialTerms?: (
    payload: Omit<UpdateQuoteCommercialTermsPayload, 'id'>,
  ) => Promise<unknown> | unknown;
  termsPending?: boolean;
  onApprovePricing?: (
    items: ApprovedPricingItemPayload[],
  ) => Promise<unknown> | unknown;
  onPreviewPricing?: (
    items: ApprovedPricingItemPayload[],
  ) => Promise<QuotePricingPreview>;
  pricingPending?: boolean;
  pricingPreviewPending?: boolean;
  onFinalize?: () => Promise<unknown> | unknown;
  onCreateVersion?: () => Promise<unknown> | unknown;
  createVersionPending?: boolean;
  finalizePending?: boolean;
  highlightUnapproved?: boolean;
};

function detailValue(
  detail: QuoteItemDetail,
  currency: ReturnType<typeof normalizeCurrency>,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (detail.kind === 'money') {
    return formatMoney(detail.value, currency);
  }
  if (detail.kind === 'area') {
    return t('common.m2', { value: formatNumber(detail.value) });
  }
  if (detail.kind === 'percent') {
    return t('common.percent', { value: formatNumber(detail.value) });
  }
  if (detail.kind === 'number') {
    return formatNumber(detail.value);
  }
  return String(detail.value);
}

function ActionButton({
  action,
  pendingAction,
  onClick,
}: {
  action: QuoteAction;
  pendingAction?: QuoteAction | null;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const pending = pendingAction === action;
  const labels: Record<QuoteAction, string> = {
    send: t('quotes.sendToClient'),
    approve: t('quotes.approve'),
    reject: t('quotes.reject'),
    'client-accept': t('quotes.clientAccept'),
    convert: t('quotes.convertToDeal'),
  };
  const icons: Record<QuoteAction, typeof Send> = {
    send: Send,
    approve: BadgeCheck,
    reject: XCircle,
    'client-accept': UserCheck,
    convert: BriefcaseBusiness,
  };
  const Icon = icons[action];

  return (
    <Button
      type="button"
      size="sm"
      variant={action === 'reject' ? 'destructive' : 'outline'}
      disabled={Boolean(pendingAction)}
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
      {pending ? t('common.executing') : labels[action]}
    </Button>
  );
}

export function QuoteCard({
  quote,
  currentUserId,
  permissions,
  managerName,
  isLatest = false,
  conversionAllowed = true,
  pendingAction,
  onSend,
  onApprove,
  onReject,
  onClientAccept,
  onConvert,
  onDownloadPdf,
  pdfPending = false,
  onDownloadDocx,
  docxPending = false,
  onSaveCommercialTerms,
  termsPending = false,
  onApprovePricing,
  onPreviewPricing,
  pricingPending = false,
  pricingPreviewPending = false,
  onFinalize,
  onCreateVersion,
  createVersionPending = false,
  finalizePending = false,
  highlightUnapproved = false,
}: QuoteCardProps) {
  const { t, messages } = useI18n();
  const { quoteStatusLabels } = useLabelMaps();
  const mixedCurrencies = quoteUsesMixedCurrencies(quote);
  const locked = isQuoteFinalized(quote);
  const currency = normalizeCurrency(quote.displayCurrency);
  const canApprovePricing = permissions.includes('quotes:approve');
  const actions = getQuoteActions({
    quote,
    currentUserId,
    permissions,
    conversionAllowed,
  });
  const actionHandlers: Record<QuoteAction, () => void> = {
    send: onSend,
    approve: onApprove,
    reject: onReject,
    'client-accept': onClientAccept,
    convert: onConvert,
  };
  const canMutateTerms = canMutateQuoteDraftClientTerms({
    permissions,
    currentUserId,
    managerId: quote.managerId,
    status: quote.status,
    finalizedAt: quote.finalizedAt,
  });
  const canEditNote = canEditQuoteCommercialNote(permissions);
  const customerDocumentReady = canDownloadQuoteDocument(quote, permissions);
  const legacyDocumentMissing =
    quote.documentAvailability === 'LEGACY_MISSING' ||
    (quote.status === 'converted' && !quote.pdfFileId);
  const customerDocumentIssues = locked
    ? []
    : quoteCustomerDocumentIssues(quote, messages);

  return (
    <article className="rounded border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-950" title={quote.id}>
              {t('quotes.titleVersion', {
                version: quote.versionNumber ?? 1,
                id: compactQuoteId(quote.id),
              })}
            </h4>
            <span
              className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold ${quoteStatusClassNames[quote.status]}`}
            >
              {quoteStatusLabels[quote.status]}
            </span>
            {locked ? (
              <span className="inline-flex rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {t('quotes.finalized')}
              </span>
            ) : null}
            {isLatest ? (
              <span className="text-xs font-medium text-slate-500">{t('common.latest')}</span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {managerName
              ? t('quotes.createdWithManager', {
                  date: formatDateTime(quote.createdAt),
                  manager: managerName,
                })
              : t('quotes.created', { date: formatDateTime(quote.createdAt) })}
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div className="text-xs text-slate-500">{t('common.total')}</div>
          <div className="text-lg font-semibold text-slate-950">
            {mixedCurrencies
              ? t('quotes.mixedCurrencyHint')
              : formatMoney(quote.totalAmount, currency)}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4">
        <MetaField
          label={t('quotes.delivery')}
          value={
            quote.deliveryCost !== undefined && quote.deliveryCost !== null
              ? mixedCurrencies
                ? t('quotes.mixedCurrencyHint')
                : formatMoney(quote.deliveryCost, currency)
              : t('common.notSpecified')
          }
        />
        <MetaField label={t('quotes.validUntilMeta')} value={formatDate(quote.validUntil)} />
        <MetaField
          label={t('quotes.clientConsent')}
          value={
            quote.clientAcceptedAt
              ? formatDateTime(quote.clientAcceptedAt)
              : t('common.notRecorded')
          }
        />
        <MetaField label={t('quotes.itemCount')} value={String(quote.items.length)} />
      </dl>

      {(canApprovePricing || locked) && quote.items.length > 0 ? (
        <QuoteApprovedPricing
          quote={quote}
          canApprove={
            canApprovePricing &&
            Boolean(onApprovePricing) &&
            Boolean(onPreviewPricing) &&
            !locked
          }
          canFinalize={canApprovePricing && Boolean(onFinalize) && !locked}
          highlightUnapproved={highlightUnapproved}
          pricingPending={pricingPending}
          previewPending={pricingPreviewPending}
          finalizePending={finalizePending}
          onApprove={onApprovePricing ?? (async () => undefined)}
          onPreview={
            onPreviewPricing ??
            (async () => ({
              cnyUsdRate: 0,
              sellingCoefficient: 2,
              currencyCode: 'USD',
              items: [],
            }))
          }
          onFinalize={onFinalize ?? (async () => undefined)}
        />
      ) : null}

      <QuoteCommercialTermsSection
        quote={quote}
        canMutate={canMutateTerms && Boolean(onSaveCommercialTerms)}
        canEditNote={canEditNote}
        pending={termsPending}
        onSave={onSaveCommercialTerms}
      />

      {quote.clientComment || quote.rejectionReason ? (
        <div className="space-y-3 border-b border-slate-200 p-4 text-sm">
          {quote.clientComment ? (
            <TextBlock label={t('quotes.clientComment')} value={quote.clientComment} />
          ) : null}
          {quote.rejectionReason ? (
            <TextBlock label={t('quotes.rejectionReason')} value={quote.rejectionReason} tone="danger" />
          ) : null}
        </div>
      ) : null}

      <details className="border-b border-slate-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
          {t('quotes.composition', { count: quote.items.length })}
        </summary>
        <div className="divide-y divide-slate-200 border-t border-slate-200">
          {quote.items.map((item, index) => (
            <div key={item.id} className="p-4">
              <div className="text-sm font-semibold text-slate-950">
                {index + 1}. {quoteItemTitle(item, messages)}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
                {getQuoteItemDetails(item, messages).map((detail) => (
                  <div key={detail.label} className="min-w-0">
                    <dt className="text-slate-500">{detail.label}</dt>
                    <dd className="mt-0.5 break-words font-medium text-slate-800">
                      {detailValue(
                      detail,
                      parseCommercialCurrency(item.currencyCode) ?? currency,
                      t,
                    )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          {quote.items.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">{t('quotes.emptyItems')}</div>
          ) : null}
        </div>
      </details>

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {quote.dealId ? (
            <Link
              href={dealWorkspaceHref({ dealId: quote.dealId })}
              className="font-medium text-slate-700 underline underline-offset-4"
            >
              {t('quotes.openDeal', { id: quote.dealId.slice(0, 8).toUpperCase() })}
            </Link>
          ) : (
            <span className="text-slate-500">{t('quotes.dealNotCreated')}</span>
          )}
          {customerDocumentIssues.length > 0 ? (
            <div className="w-full space-y-1 text-sm text-red-700">
              {customerDocumentIssues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          ) : null}
          {legacyDocumentMissing ? (
            <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800">
              {t('quotes.legacyMissing')}
            </span>
          ) : null}
          {onDownloadDocx && !legacyDocumentMissing ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={docxPending || !customerDocumentReady}
              onClick={onDownloadDocx}
            >
              <Download aria-hidden="true" />
              {docxPending ? t('common.downloading') : t('quotes.downloadDocx')}
            </Button>
          ) : null}
          {onDownloadPdf && !legacyDocumentMissing ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pdfPending || !customerDocumentReady}
              onClick={onDownloadPdf}
            >
              <Download aria-hidden="true" />
              {pdfPending ? t('common.downloading') : t('quotes.downloadPdf')}
            </Button>
          ) : null}
          {locked && onCreateVersion && !quote.nextVersion ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={createVersionPending}
              onClick={() =>
                void Promise.resolve(onCreateVersion()).catch(() => undefined)
              }
            >
              {createVersionPending
                ? t('quotes.creatingVersion')
                : t('quotes.createVersion')}
            </Button>
          ) : null}
        </div>
        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {actions.map((action) => (
              <ActionButton
                key={action}
                action={action}
                pendingAction={pendingAction}
                onClick={actionHandlers[action]}
              />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function TextBlock({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <div>
      <div className={tone === 'danger' ? 'font-medium text-red-700' : 'font-medium text-slate-700'}>
        {label}
      </div>
      <p className={tone === 'danger' ? 'mt-1 whitespace-pre-wrap text-red-700' : 'mt-1 whitespace-pre-wrap text-slate-700'}>
        {value}
      </p>
    </div>
  );
}

function formatDayRange(
  from: number | null | undefined,
  to: number | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (from == null || to == null) {
    return t('common.dash');
  }

  return t('common.daysRange', { from, to });
}

function QuoteCommercialTermsSection({
  quote,
  canMutate,
  canEditNote,
  pending,
  onSave,
}: {
  quote: Quote;
  canMutate: boolean;
  canEditNote: boolean;
  pending: boolean;
  onSave?: (
    payload: Omit<UpdateQuoteCommercialTermsPayload, 'id'>,
  ) => Promise<unknown> | unknown;
}) {
  const { t } = useI18n();
  if (canMutate && onSave) {
    return (
      <QuoteDraftTermsForm
        key={`${quote.id}:${quote.updatedAt}:${quote.finalizedAt ?? ''}`}
        quote={quote}
        canEditNote={canEditNote}
        pending={pending}
        onSave={onSave}
      />
    );
  }

  return (
    <div className="space-y-3 border-b border-slate-200 p-4 text-sm">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetaField
          label={t('quotes.productionTerms')}
          value={
            quote.productionTerms?.trim() ||
            formatDayRange(quote.productionDaysFrom, quote.productionDaysTo, t)
          }
        />
        <MetaField
          label={t('quotes.deliveryTerms')}
          value={
            quote.deliveryTerms?.trim() ||
            formatDayRange(quote.deliveryDaysFrom, quote.deliveryDaysTo, t)
          }
        />
        <MetaField label={t('quotes.documentDate')} value={quoteAutomaticDate(quote)} />
        <MetaField
          label={t('quotes.validUntil')}
          value={formatDate(quote.validUntil)}
        />
      </dl>
      <div>
        <div className="font-medium text-slate-700">{t('quotes.commercialNote')}</div>
        <p className="mt-1 whitespace-pre-wrap text-slate-700">
          {quote.commercialNote?.trim() || t('common.dash')}
        </p>
      </div>
    </div>
  );
}

function QuoteDraftTermsForm({
  quote,
  canEditNote,
  pending,
  onSave,
}: {
  quote: Quote;
  canEditNote: boolean;
  pending: boolean;
  onSave: (
    payload: Omit<UpdateQuoteCommercialTermsPayload, 'id'>,
  ) => Promise<unknown> | unknown;
}) {
  const { t, messages } = useI18n();
  const [productionTerms, setProductionTerms] = useState(
    quote.productionTerms?.trim() || '',
  );
  const [deliveryTerms, setDeliveryTerms] = useState(
    quote.deliveryTerms?.trim() || '',
  );
  const [validUntil, setValidUntil] = useState(
    toDateInputValue(quote.validUntil),
  );
  const [commercialNote, setCommercialNote] = useState(
    quote.commercialNote ?? '',
  );
  const [internalCommercialNote, setInternalCommercialNote] = useState(
    quote.internalCommercialNote ?? '',
  );
  const [error, setError] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    const termsError = validateQuoteCommercialTerms({
      productionTerms,
      deliveryTerms,
      validUntil,
      commercialNote,
      internalCommercialNote,
    }, messages);
    if (termsError) {
      setError(termsError);
      return;
    }

    setError(null);
    await onSave(
      buildQuoteCommercialTermsPayload(
        {
          productionTerms,
          deliveryTerms,
          validUntil,
          commercialNote,
          internalCommercialNote,
        },
        { includeNote: canEditNote },
      ),
    );
  };

  return (
    <form
      className="space-y-3 border-b border-slate-200 p-4 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void save().catch(() => undefined);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            {t('quotes.productionTerms')}
          </span>
          <textarea
            value={productionTerms}
            maxLength={500}
            rows={2}
            aria-label={t('quotes.productionTerms')}
            placeholder={t('quotes.productionTermsPlaceholder')}
            onChange={(event) => {
              setProductionTerms(event.target.value);
              setError(null);
            }}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            {t('quotes.deliveryTerms')}
          </span>
          <textarea
            value={deliveryTerms}
            maxLength={500}
            rows={2}
            aria-label={t('quotes.deliveryTerms')}
            placeholder={t('quotes.deliveryTermsPlaceholder')}
            onChange={(event) => {
              setDeliveryTerms(event.target.value);
              setError(null);
            }}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>
      </div>
      <label className="block max-w-xs">
        <span className="mb-1 block text-sm font-medium text-slate-700">
            {t('quotes.validUntil')}
          </span>
          <input
            type="date"
            value={validUntil}
            aria-label={t('quotes.validUntil')}
          onChange={(event) => {
            setValidUntil(event.target.value);
            setError(null);
          }}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </label>
      <div>
        <div className="text-xs text-slate-500">{t('quotes.documentDate')}</div>
        <div className="mt-1 font-medium text-slate-900">
          {quoteAutomaticDate(quote)}
        </div>
      </div>
      {canEditNote ? (
        <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            {t('quotes.commercialNote')}
          </span>
          <textarea
            value={commercialNote}
            aria-label={t('quotes.commercialNote')}
            rows={3}
            onChange={(event) => {
              setCommercialNote(event.target.value);
              setError(null);
            }}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            {t('quotes.internalNote')}
          </span>
          <textarea
            value={internalCommercialNote}
            aria-label={t('quotes.internalNote')}
            rows={3}
            maxLength={2000}
            onChange={(event) => {
              setInternalCommercialNote(event.target.value);
              setError(null);
            }}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>
        </div>
      ) : (
        <div>
          <div className="font-medium text-slate-700">{t('quotes.commercialNote')}</div>
          <p className="mt-1 whitespace-pre-wrap text-slate-700">
            {quote.commercialNote?.trim() || t('common.dash')}
          </p>
        </div>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t('common.saving') : t('quotes.saveTerms')}
      </Button>
    </form>
  );
}
