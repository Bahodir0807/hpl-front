'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import {
  getApiErrorCode,
  QUOTE_ALREADY_EXISTS,
  QUOTE_SUPPLIER_REQUIRED,
  QUOTE_SUPPLIER_REQUIRED_MESSAGE,
} from '../lib/hpl-errors';
import type {
  PatchCalculationRequestPayload,
  UpsertCalculationRequestPayload,
} from '../lib/calculation-request';
import {
  CalculationRequest,
  HplListResponse,
  Quote,
  unwrapHplList,
} from '../types/hpl';

import { useI18n } from '@/i18n/provider';

export type CalculationRequestListFilters = {
  leadId?: string;
  clientId?: string;
  status?: string;
};

function invalidateRequestQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  request?: CalculationRequest,
): void {
  void queryClient.invalidateQueries({ queryKey: ['calculation-requests'] });
  if (request?.leadId) {
    void queryClient.invalidateQueries({
      queryKey: ['lead-workspace', request.leadId],
    });
    void queryClient.invalidateQueries({
      queryKey: ['calculations', request.leadId],
    });
  }
}

export function useCalculationRequests(filters: CalculationRequestListFilters = {}) {
  return useQuery({
    queryKey: ['calculation-requests', filters],
    queryFn: async (): Promise<CalculationRequest[]> => {
      const response = await apiClient.get<HplListResponse<CalculationRequest>>(
        '/calculations/requests',
        {
          params: {
            limit: 100,
            ...(filters.leadId ? { leadId: filters.leadId } : {}),
            ...(filters.clientId ? { clientId: filters.clientId } : {}),
            ...(filters.status ? { status: filters.status } : {}),
          },
        },
      );

      return unwrapHplList(response.data);
    },
  });
}

export function useCalculationRequest(id?: string | null) {
  return useQuery({
    queryKey: ['calculation-requests', id],
    queryFn: async (): Promise<CalculationRequest> => {
      const response = await apiClient.get<CalculationRequest>(
        `/calculations/requests/${id}`,
      );
      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateCalculationRequest() {
  const queryClient = useQueryClient();
  const { t, messages } = useI18n();

  return useMutation({
    mutationFn: async (
      payload: UpsertCalculationRequestPayload,
    ): Promise<CalculationRequest> => {
      const response = await apiClient.post<CalculationRequest>(
        '/calculations/requests',
        payload,
      );
      return response.data;
    },
    onSuccess: (request) => {
      showSuccess(t('calculations.toastCreated'));
      invalidateRequestQueries(queryClient, request);
    },
    onError: (error) => {
      showError(getErrorMessage(error, t('calculations.createFailed'), messages));
    },
  });
}

export function useUpdateCalculationRequest() {
  const queryClient = useQueryClient();
  const { t, messages } = useI18n();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      body: PatchCalculationRequestPayload;
    }): Promise<CalculationRequest> => {
      const response = await apiClient.patch<CalculationRequest>(
        `/calculations/requests/${payload.id}`,
        payload.body,
      );
      return response.data;
    },
    onSuccess: (request) => {
      showSuccess(t('calculations.toastSaved'));
      invalidateRequestQueries(queryClient, request);
      void queryClient.invalidateQueries({
        queryKey: ['calculation-requests', request.id],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error, t('calculations.saveFailed'), messages));
    },
  });
}

export function useSubmitCalculationRequest() {
  const queryClient = useQueryClient();
  const { t, messages } = useI18n();

  return useMutation({
    mutationFn: async (id: string): Promise<CalculationRequest> => {
      const response = await apiClient.post<CalculationRequest>(
        `/calculations/requests/${id}/submit`,
      );
      return response.data;
    },
    onSuccess: (request) => {
      showSuccess(t('calculations.toastSubmitted'));
      invalidateRequestQueries(queryClient, request);
      void queryClient.invalidateQueries({
        queryKey: ['calculation-requests', request.id],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error, t('calculations.submitFailed'), messages));
    },
  });
}

export function useConvertCalculationRequestToQuote() {
  const queryClient = useQueryClient();
  const { t, messages } = useI18n();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
    }): Promise<Quote> => {
      const response = await apiClient.post<Quote>(
        `/calculations/requests/${payload.id}/convert-to-quote`,
        {},
      );
      return response.data;
    },
    onSuccess: (quote) => {
      showSuccess(t('calculations.toastQuoteCreated'));
      queryClient.setQueryData(['quotes', 'detail', quote.id], quote);
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      void queryClient.invalidateQueries({ queryKey: ['calculation-requests'] });
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
      showError(
        getApiErrorCode(error) === QUOTE_SUPPLIER_REQUIRED
          ? QUOTE_SUPPLIER_REQUIRED_MESSAGE
          : getErrorMessage(error, t('calculations.quoteCreateFailed'), messages),
      );
      if (getApiErrorCode(error) === QUOTE_ALREADY_EXISTS) {
        void queryClient.invalidateQueries({ queryKey: ['calculation-requests'] });
        void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      }
    },
  });
}
