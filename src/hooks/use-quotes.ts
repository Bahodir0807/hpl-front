'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { HplListResponse, PatchableQuoteStatus, Quote, QuotePricingPreview, unwrapHplList } from '../types/hpl';
import type { ApprovedPricingItemPayload } from '../lib/quote-pricing';
import { getApiErrorCode, QUOTE_TERMS_LOCKED, materializeAxiosError, createApiErrorFromPayload } from '../lib/hpl-errors';

export type { PatchableQuoteStatus, Quote, QuoteItem, QuoteStatus } from '../types/hpl';

function updateQuoteLists(
  current: Quote[] | undefined,
  updatedQuote: Quote,
): Quote[] | undefined {
  if (!current || !Array.isArray(current)) {
    return current;
  }

  return current.map((quote) =>
    quote.id === updatedQuote.id ? updatedQuote : quote,
  );
}

export type ConvertCalculationToQuotePayload = {
  calculationId?: string;
  deliveryCost?: number;
  validUntil?: string;
  clientComment?: string;
  commercialNote?: string;
  productionDaysFrom?: number;
  productionDaysTo?: number;
  deliveryDaysFrom?: number;
  deliveryDaysTo?: number;
};

export function useQuotes(leadId?: string) {
  return useQuery({
    queryKey: ['quotes', leadId],
    queryFn: async (): Promise<Quote[]> => {
      const response = await apiClient.get<HplListResponse<Quote>>('/quotes', {
        params: {
          limit: 100,
          ...(leadId ? { leadId } : {}),
        },
      });

      return unwrapHplList(response.data);
    },
  });
}

export function useClientQuotes(clientId: string) {
  return useQuery({
    queryKey: ['quotes', 'client', clientId],
    queryFn: async (): Promise<Quote[]> => {
      const response = await apiClient.get<HplListResponse<Quote>>('/quotes', {
        params: { clientId, limit: 100 },
      });

      return unwrapHplList(response.data);
    },
    enabled: Boolean(clientId),
  });
}

export function useQuote(id?: string | null) {
  return useQuery({
    queryKey: ['quotes', 'detail', id],
    queryFn: async (): Promise<Quote> => {
      const response = await apiClient.get<Quote>(`/quotes/${id}`);
      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useConvertCalculationToQuote(calculationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload?: ConvertCalculationToQuotePayload,
    ): Promise<Quote> => {
      const id = payload?.calculationId ?? calculationId;

      if (!id) {
        throw new Error('Не указан расчёт для конвертации в КП');
      }

      const response = await apiClient.post<Quote>(
        `/calculations/${id}/convert-to-quote`,
        {
          ...(payload?.deliveryCost !== undefined
            ? { deliveryCost: payload.deliveryCost }
            : {}),
          ...(payload?.validUntil ? { validUntil: payload.validUntil } : {}),
          ...(payload?.clientComment
            ? { clientComment: payload.clientComment }
            : {}),
          ...(payload?.commercialNote
            ? { commercialNote: payload.commercialNote }
            : {}),
          ...(payload?.productionDaysFrom !== undefined
            ? { productionDaysFrom: payload.productionDaysFrom }
            : {}),
          ...(payload?.productionDaysTo !== undefined
            ? { productionDaysTo: payload.productionDaysTo }
            : {}),
          ...(payload?.deliveryDaysFrom !== undefined
            ? { deliveryDaysFrom: payload.deliveryDaysFrom }
            : {}),
          ...(payload?.deliveryDaysTo !== undefined
            ? { deliveryDaysTo: payload.deliveryDaysTo }
            : {}),
        },
      );

      return response.data;
    },
    onSuccess: (quote) => {
      showSuccess('КП создано из расчёта');
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      void queryClient.invalidateQueries({ queryKey: ['calculations'] });
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', quote.leadId],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export type UpdateQuoteCommercialTermsPayload = {
  id: string;
  validUntil?: string;
  commercialNote?: string;
  internalCommercialNote?: string;
  productionTerms?: string;
  deliveryTerms?: string;
  productionDaysFrom?: number;
  productionDaysTo?: number;
  deliveryDaysFrom?: number;
  deliveryDaysTo?: number;
};

export function useUpdateQuoteCommercialTerms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: UpdateQuoteCommercialTermsPayload,
    ): Promise<Quote> => {
      const response = await apiClient.patch<Quote>(
        `/quotes/${payload.id}/commercial-terms`,
        {
          ...(payload.validUntil ? { validUntil: payload.validUntil } : {}),
          ...(payload.commercialNote !== undefined
            ? { commercialNote: payload.commercialNote }
            : {}),
          ...(payload.internalCommercialNote !== undefined
            ? { internalCommercialNote: payload.internalCommercialNote }
            : {}),
          ...(payload.productionTerms !== undefined
            ? { productionTerms: payload.productionTerms }
            : {}),
          ...(payload.deliveryTerms !== undefined
            ? { deliveryTerms: payload.deliveryTerms }
            : {}),
          ...(payload.productionDaysFrom !== undefined
            ? { productionDaysFrom: payload.productionDaysFrom }
            : {}),
          ...(payload.productionDaysTo !== undefined
            ? { productionDaysTo: payload.productionDaysTo }
            : {}),
          ...(payload.deliveryDaysFrom !== undefined
            ? { deliveryDaysFrom: payload.deliveryDaysFrom }
            : {}),
          ...(payload.deliveryDaysTo !== undefined
            ? { deliveryDaysTo: payload.deliveryDaysTo }
            : {}),
        },
      );

      return response.data;
    },
    onSuccess: (quote) => {
      showSuccess('Коммерческие условия КП обновлены');
      queryClient.setQueriesData<Quote[]>(
        { queryKey: ['quotes'] },
        (current) => updateQuoteLists(current, quote),
      );
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', quote.leadId],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export type ApproveQuotePricingPayload = {
  id: string;
  items: ApprovedPricingItemPayload[];
};

export function usePreviewQuotePricing() {
  return useMutation({
    mutationFn: async (
      payload: ApproveQuotePricingPayload,
    ): Promise<QuotePricingPreview> => {
      const response = await apiClient.post<QuotePricingPreview>(
        `/quotes/${payload.id}/pricing-preview`,
        { items: payload.items },
      );
      return response.data;
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Не удалось рассчитать цены КП.'));
    },
  });
}

export function useApproveQuotePricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ApproveQuotePricingPayload): Promise<Quote> => {
      const response = await apiClient.patch<Quote>(
        `/quotes/${payload.id}/approved-pricing`,
        { items: payload.items },
      );
      return response.data;
    },
    onSuccess: (quote) => {
      showSuccess('Коммерческие цены утверждены');
      queryClient.setQueryData(['quotes', 'detail', quote.id], quote);
      queryClient.setQueriesData<Quote[]>(
        { queryKey: ['quotes'] },
        (current) => updateQuoteLists(current, quote),
      );
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      if (quote.leadId) {
        void queryClient.invalidateQueries({
          queryKey: ['lead-workspace', quote.leadId],
        });
      }
      if (quote.clientId) {
        void queryClient.invalidateQueries({
          queryKey: ['quotes', 'client', quote.clientId],
        });
      }
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Не удалось утвердить цены КП.'));
    },
  });
}

export function useFinalizeQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Quote> => {
      const response = await apiClient.post<Quote>(`/quotes/${id}/finalize`);
      return response.data;
    },
    onSuccess: (quote) => {
      showSuccess('КП сформировано');
      queryClient.setQueryData(['quotes', 'detail', quote.id], quote);
      queryClient.setQueriesData<Quote[]>(
        { queryKey: ['quotes'] },
        (current) => updateQuoteLists(current, quote),
      );
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      if (quote.leadId) {
        void queryClient.invalidateQueries({
          queryKey: ['lead-workspace', quote.leadId],
        });
      }
      if (quote.clientId) {
        void queryClient.invalidateQueries({
          queryKey: ['quotes', 'client', quote.clientId],
        });
      }
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Не удалось сформировать КП.'));
    },
  });
}

export function useCreateQuoteVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<Quote> => {
      const response = await apiClient.post<Quote>(`/quotes/${id}/versions`);
      return response.data;
    },
    onSuccess: (quote) => {
      showSuccess(`Создана версия КП v${quote.versionNumber ?? 2}`);
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      void queryClient.invalidateQueries({ queryKey: ['lead-workspace', quote.leadId] });
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function isQuoteTermsLockedError(error: unknown): boolean {
  return getApiErrorCode(error) === QUOTE_TERMS_LOCKED;
}

export type UpdateQuoteStatusPayload = {
  id: string;
  status: PatchableQuoteStatus;
  rejectionReason?: string;
};

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateQuoteStatusPayload): Promise<Quote> => {
      const response = await apiClient.patch<Quote>(
        `/quotes/${payload.id}/status`,
        {
          status: payload.status,
          ...(payload.rejectionReason
            ? { rejectionReason: payload.rejectionReason }
            : {}),
        },
      );

      return response.data;
    },
    onSuccess: (quote) => {
      showSuccess('Статус КП обновлён');
      queryClient.setQueriesData<Quote[]>(
        { queryKey: ['quotes'] },
        (current) => updateQuoteLists(current, quote),
      );
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', quote.leadId],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useRecordQuoteClientAcceptance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Quote> => {
      const response = await apiClient.post<Quote>(`/quotes/${id}/client-accept`);

      return response.data;
    },
    onSuccess: (quote) => {
      showSuccess('Согласие клиента зафиксировано');
      queryClient.setQueriesData<Quote[]>(
        { queryKey: ['quotes'] },
        (current) => updateQuoteLists(current, quote),
      );
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', quote.leadId],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useConvertQuoteToDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ quote: Quote; dealId: string }> => {
      const response = await apiClient.post<{ quote: Quote; dealId: string }>(
        `/quotes/${id}/convert-to-deal`,
      );

      return response.data;
    },
    onSuccess: (result) => {
      showSuccess('КП конвертировано в сделку');
      queryClient.setQueriesData<Quote[]>(
        { queryKey: ['quotes'] },
        (current) => updateQuoteLists(current, result.quote),
      );
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      void queryClient.invalidateQueries({ queryKey: ['deals'] });
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', result.quote.leadId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['lead', result.quote.leadId],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

function filenameFromContentDisposition(header?: string): string | null {
  if (!header) {
    return null;
  }

  const utfMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const quoted = header.match(/filename="([^"]+)"/i);
  if (quoted?.[1]) {
    return quoted[1];
  }

  const plain = header.match(/filename=([^;]+)/i);
  return plain?.[1]?.trim() ?? null;
}

export function useDownloadQuotePdf() {
  return useDownloadQuoteDocument('pdf');
}

export function useDownloadQuoteDocx() {
  return useDownloadQuoteDocument('docx');
}

function useDownloadQuoteDocument(format: 'pdf' | 'docx') {
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      let response;
      try {
        response = await apiClient.get<Blob>(`/quotes/${id}/${format}`, {
          responseType: 'blob',
        });
      } catch (error) {
        throw await materializeAxiosError(error);
      }
      const blob = response.data;
      if (blob.type && blob.type.includes('application/json')) {
        const text = await blob.text();
        let parsed: unknown = text;
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          parsed = { message: text };
        }
        throw createApiErrorFromPayload(parsed, text || 'Не удалось скачать КП');
      }

      const filename =
        filenameFromContentDisposition(
          String(response.headers['content-disposition'] ?? ''),
        ) ?? `quote-${id}.${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Не удалось скачать КП.'));
    },
  });
}
