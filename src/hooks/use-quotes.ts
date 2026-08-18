'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import {
  HplListResponse,
  PatchableQuoteStatus,
  Quote,
  unwrapHplList,
} from '../types/hpl';

export type { PatchableQuoteStatus, Quote, QuoteItem, QuoteStatus } from '../types/hpl';

export type ConvertCalculationToQuotePayload = {
  calculationId?: string;
  deliveryCost?: number;
  validUntil?: string;
  clientComment?: string;
};

export function useQuotes(leadId?: string) {
  return useQuery({
    queryKey: ['quotes', leadId],
    queryFn: async (): Promise<Quote[]> => {
      const response = await apiClient.get<HplListResponse<Quote>>('/quotes', {
        params: leadId ? { leadId } : undefined,
      });

      return unwrapHplList(response.data);
    },
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
