'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { useI18n } from '@/i18n/provider';

export const CURRENCY_RATES_READ_PERMISSION = 'currency_rates:read';
export const CURRENCY_RATES_MANAGE_PERMISSION = 'currency_rates:manage';

export type CurrencyRateCurrent = {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
};

export type CurrencyRate = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string | number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdById?: string;
  createdAt?: string;
};

export type CreateCurrencyRatePayload = {
  rate: string;
  effectiveFrom?: string;
};

export function useCurrentCurrencyRate(enabled = true) {
  return useQuery({
    queryKey: ['currency-rates', 'current'],
    queryFn: async (): Promise<CurrencyRateCurrent> => {
      const response = await apiClient.get<CurrencyRateCurrent>(
        '/currency-rates/current',
      );
      return response.data;
    },
    enabled,
    retry: false,
  });
}

export function useCreateCurrencyRate() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (payload: CreateCurrencyRatePayload): Promise<CurrencyRate> => {
      const response = await apiClient.post<CurrencyRate>('/currency-rates', {
        rate: payload.rate,
        ...(payload.effectiveFrom ? { effectiveFrom: payload.effectiveFrom } : {}),
      });
      return response.data;
    },
    onSuccess: () => {
      showSuccess(t('toasts.currencyRateSaved'));
      void queryClient.invalidateQueries({ queryKey: ['currency-rates'] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
