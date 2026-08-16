'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { HplListResponse, Quote, QuoteStatus, unwrapHplList } from '../types/hpl';

export type { Quote, QuoteItem, QuoteStatus } from '../types/hpl';

export type ConvertCalculationToQuotePayload = {
  calculationId?: string;
  deliveryAmount?: number;
  validUntil?: string;
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
          deliveryAmount: payload?.deliveryAmount,
          validUntil: payload?.validUntil,
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
  status: QuoteStatus;
};

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateQuoteStatusPayload): Promise<Quote> => {
      const response = await apiClient.patch<Quote>(
        `/quotes/${payload.id}/status`,
        { status: payload.status },
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
