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

export type { CalculationRequest } from '../types/hpl';

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
      showSuccess('Запрос расчёта создан');
      invalidateRequestQueries(queryClient, request);
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Не удалось создать запрос расчёта.'));
    },
  });
}

export function useUpdateCalculationRequest() {
  const queryClient = useQueryClient();

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
      showSuccess('Запрос расчёта сохранён');
      invalidateRequestQueries(queryClient, request);
      void queryClient.invalidateQueries({
        queryKey: ['calculation-requests', request.id],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Не удалось сохранить запрос расчёта.'));
    },
  });
}

export function useSubmitCalculationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<CalculationRequest> => {
      const response = await apiClient.post<CalculationRequest>(
        `/calculations/requests/${id}/submit`,
      );
      return response.data;
    },
    onSuccess: (request) => {
      showSuccess('Запрос отправлен руководителю');
      invalidateRequestQueries(queryClient, request);
      void queryClient.invalidateQueries({
        queryKey: ['calculation-requests', request.id],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Не удалось отправить запрос руководителю.'));
    },
  });
}

export function useConvertCalculationRequestToQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      supplierId?: string;
    }): Promise<Quote> => {
      const response = await apiClient.post<Quote>(
        `/calculations/requests/${payload.id}/convert-to-quote`,
        payload.supplierId ? { supplierId: payload.supplierId } : {},
      );
      return response.data;
    },
    onSuccess: (quote) => {
      showSuccess('Черновик КП создан из запроса');
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
          : getErrorMessage(error, 'Не удалось создать черновик КП.'),
      );
      if (getApiErrorCode(error) === QUOTE_ALREADY_EXISTS) {
        void queryClient.invalidateQueries({ queryKey: ['calculation-requests'] });
        void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      }
    },
  });
}
