'use client';

import { useState } from 'react';
import { QuoteCard } from '@/components/quotes/quote-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  useApproveQuotePricing,
  useClientQuotes,
  useConvertQuoteToDeal,
  useDownloadQuoteDocx,
  useDownloadQuotePdf,
  useFinalizeQuote,
  useCreateQuoteVersion,
  usePreviewQuotePricing,
  useQuote,
  useRecordQuoteClientAcceptance,
  useUpdateQuoteCommercialTerms,
  useUpdateQuoteStatus,
  isQuoteTermsLockedError,
} from '@/hooks/use-quotes';
import { getApiErrorCode, QUOTE_PRICE_NOT_APPROVED } from '@/lib/hpl-errors';
import { formatDateTime } from '@/lib/format';
import { compactQuoteId, quoteStatusLabels } from '@/lib/quote-presentation';
import { isQuoteFinalized, quoteUsesMixedCurrencies, canDownloadQuoteDocument } from '@/lib/quote-pricing';
import { formatPersonName } from '@/lib/display-names';
import type { Quote } from '@/types/hpl';

type ClientQuotesProps = {
  clientId: string;
};

export function ClientQuotes({ clientId }: ClientQuotesProps) {
  const { user } = useAuth();
  const quotesQuery = useClientQuotes(clientId);
  const [openId, setOpenId] = useState<string | null>(null);
  const quoteQuery = useQuote(openId);
  const updateQuoteStatus = useUpdateQuoteStatus();
  const updateQuoteCommercialTerms = useUpdateQuoteCommercialTerms();
  const recordClientAcceptance = useRecordQuoteClientAcceptance();
  const convertQuoteToDeal = useConvertQuoteToDeal();
  const downloadQuotePdf = useDownloadQuotePdf();
  const downloadQuoteDocx = useDownloadQuoteDocx();
  const approvePricing = useApproveQuotePricing();
  const previewPricing = usePreviewQuotePricing();
  const finalizeQuote = useFinalizeQuote();
  const createQuoteVersion = useCreateQuoteVersion();
  const [highlightUnapproved, setHighlightUnapproved] = useState(false);

  const quotes = quotesQuery.data ?? [];
  const openQuote = quoteQuery.data;

  const handleFinalize = async (id: string): Promise<void> => {
    try {
      await finalizeQuote.mutateAsync(id);
      setHighlightUnapproved(false);
    } catch (error) {
      if (getApiErrorCode(error) === QUOTE_PRICE_NOT_APPROVED) {
        setHighlightUnapproved(true);
      }
      if (isQuoteTermsLockedError(error)) {
        await quoteQuery.refetch();
      }
    }
  };

  const handleApprovePricing = async (
    id: string,
    items: Array<{ id: string; purchasePricePerM2Cny: string }>,
  ): Promise<void> => {
    try {
      await approvePricing.mutateAsync({ id, items });
    } catch (error) {
      if (isQuoteTermsLockedError(error)) {
        await quoteQuery.refetch();
      }
    }
  };

  return (
    <div className="space-y-4">
      {quotesQuery.isLoading ? (
        <p className="text-sm text-slate-600">Загрузка КП...</p>
      ) : null}
      {quotesQuery.isError ? (
        <div className="flex items-center justify-between gap-3 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>Не удалось загрузить коммерческие предложения.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void quotesQuery.refetch()}
          >
            Повторить
          </Button>
        </div>
      ) : null}

      {!quotesQuery.isLoading && !quotesQuery.isError && quotes.length === 0 ? (
        <div className="border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Коммерческих предложений пока нет.
        </div>
      ) : null}

      {quotes.length > 0 ? (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  КП
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Дата
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Статус
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Менеджер
                </th>
                <th className="px-3 py-2 text-right font-semibold text-slate-700">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quotes.map((quote) => {
                const canDownload = canDownloadQuoteDocument(
                  quote,
                  user?.permissions ?? [],
                );
                return (
                <QuoteHistoryRow
                  key={quote.id}
                  quote={quote}
                  canDownload={canDownload}
                  onOpen={() => setOpenId(quote.id)}
                  onPdf={() => void downloadQuotePdf.mutateAsync(quote.id)}
                  onDocx={() => void downloadQuoteDocx.mutateAsync(quote.id)}
                  pdfPending={
                    downloadQuotePdf.isPending &&
                    downloadQuotePdf.variables === quote.id
                  }
                  docxPending={
                    downloadQuoteDocx.isPending &&
                    downloadQuoteDocx.variables === quote.id
                  }
                />
              );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {openId ? (
        <div className="space-y-3">
          {quoteQuery.isLoading ? (
            <p className="text-sm text-slate-600">Загрузка КП...</p>
          ) : null}
          {quoteQuery.isError ? (
            <p className="text-sm text-red-600">Не удалось открыть КП.</p>
          ) : null}
          {openQuote ? (
            <QuoteCard
              quote={openQuote}
              currentUserId={user?.id}
              permissions={user?.permissions ?? []}
              managerName={
                openQuote.manager
                  ? formatPersonName(openQuote.manager)
                  : undefined
              }
              conversionAllowed={false}
              onSend={() => {
                void updateQuoteStatus
                  .mutateAsync({ id: openQuote.id, status: 'sent' })
                  .catch(() => undefined);
              }}
              onApprove={() => {
                void updateQuoteStatus
                  .mutateAsync({ id: openQuote.id, status: 'approved' })
                  .catch(() => undefined);
              }}
              onReject={() => undefined}
              onClientAccept={() => {
                void recordClientAcceptance
                  .mutateAsync(openQuote.id)
                  .catch(() => undefined);
              }}
              onConvert={() => {
                void convertQuoteToDeal.mutateAsync(openQuote.id).catch(() => undefined);
              }}
              onDownloadPdf={() => {
                void downloadQuotePdf.mutateAsync(openQuote.id).catch(() => undefined);
              }}
              pdfPending={
                downloadQuotePdf.isPending &&
                downloadQuotePdf.variables === openQuote.id
              }
              onDownloadDocx={() => {
                void downloadQuoteDocx.mutateAsync(openQuote.id).catch(() => undefined);
              }}
              docxPending={
                downloadQuoteDocx.isPending &&
                downloadQuoteDocx.variables === openQuote.id
              }
              onSaveCommercialTerms={(payload) =>
                updateQuoteCommercialTerms.mutateAsync({
                  id: openQuote.id,
                  ...payload,
                })
              }
              termsPending={
                updateQuoteCommercialTerms.isPending &&
                updateQuoteCommercialTerms.variables?.id === openQuote.id
              }
              onApprovePricing={(items) =>
                handleApprovePricing(openQuote.id, items)
              }
              onPreviewPricing={(items) =>
                previewPricing.mutateAsync({ id: openQuote.id, items })
              }
              pricingPending={approvePricing.isPending}
              pricingPreviewPending={previewPricing.isPending}
              onFinalize={() => handleFinalize(openQuote.id)}
              onCreateVersion={() => createQuoteVersion.mutateAsync(openQuote.id)}
              createVersionPending={createQuoteVersion.isPending}
              finalizePending={finalizeQuote.isPending}
              highlightUnapproved={highlightUnapproved}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function QuoteHistoryRow({
  quote,
  canDownload,
  onOpen,
  onPdf,
  onDocx,
  pdfPending,
  docxPending,
}: {
  quote: Quote;
  canDownload: boolean;
  onOpen: () => void;
  onPdf: () => void;
  onDocx: () => void;
  pdfPending: boolean;
  docxPending: boolean;
}) {
  const mixed = quoteUsesMixedCurrencies(quote);
  return (
    <tr>
      <td className="px-3 py-2 font-medium text-slate-900">
        {quote.number?.trim() || compactQuoteId(quote.id)}
      </td>
      <td className="px-3 py-2 text-slate-700">
        {formatDateTime(quote.createdAt)}
      </td>
      <td className="px-3 py-2 text-slate-700">
        {quoteStatusLabels[quote.status]}
        {isQuoteFinalized(quote) ? ' · финализировано' : ''}
        {quote.documentAvailability === 'LEGACY_MISSING' ||
        (quote.status === 'converted' && !quote.pdfFileId)
          ? ' · Документ отсутствует (legacy)'
          : ''}
      </td>
      <td className="px-3 py-2 text-slate-700">
        {quote.manager
          ? formatPersonName(quote.manager)
          : '—'}
        {mixed ? ' · USD/UZS' : ''}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onOpen}>
            Открыть
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canDownload || pdfPending}
            onClick={onPdf}
          >
            {pdfPending ? 'Скачивание...' : 'PDF'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canDownload || docxPending}
            onClick={onDocx}
          >
            {docxPending ? 'Скачивание...' : 'DOCX'}
          </Button>
        </div>
      </td>
    </tr>
  );
}
