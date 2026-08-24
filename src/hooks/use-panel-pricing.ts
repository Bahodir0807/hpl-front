'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { HplListResponse, unwrapHplList } from '../types/hpl';

export const PANEL_PRICING_MANAGE_PERMISSION = 'panel_pricing:manage';
export const PANEL_PRICING_QUERY_KEY = ['panel-pricing', 'thickness'] as const;

export type ThicknessPricingPanelType = {
  id: string;
  code: string;
  displayNameRu: string;
};

export type ThicknessPricing = {
  id: string;
  supplierId: string;
  qualityClassId: string;
  thicknessMm: string | number;
  basePricePerM2?: string | number;
  currencyCode: string;
  validFrom?: string;
  validTo?: string | null;
  isActive: boolean;
  supplier?: { id: string; code: string; name: string } | null;
  qualityClass?: {
    id: string;
    code?: string | null;
    nameRu?: string | null;
    name?: string | null;
  } | null;
  panelTypes?: ThicknessPricingPanelType[];
};

export type CreateThicknessPricingPayload = {
  panelTypeId: string;
  supplierId: string;
  qualityClassId: string;
  thicknessMm: string;
  basePricePerM2: string;
};

export type UpdateThicknessPricingPayload = {
  id: string;
  basePricePerM2?: string;
  isActive?: boolean;
};

export function useThicknessPricing(enabled = true) {
  return useQuery({
    queryKey: PANEL_PRICING_QUERY_KEY,
    queryFn: async (): Promise<ThicknessPricing[]> => {
      const response = await apiClient.get<HplListResponse<ThicknessPricing>>(
        '/panel-pricing/thickness',
      );
      return unwrapHplList(response.data);
    },
    enabled,
    staleTime: 0,
  });
}

function invalidatePricingQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['panel-pricing'] });
  void queryClient.invalidateQueries({ queryKey: ['calculations'] });
  void queryClient.invalidateQueries({ queryKey: ['lead-workspace'] });
}

export function useCreateThicknessPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: CreateThicknessPricingPayload,
    ): Promise<ThicknessPricing> => {
      const response = await apiClient.post<ThicknessPricing>(
        '/panel-pricing/thickness',
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      showSuccess('Закупочная цена сохранена');
      invalidatePricingQueries(queryClient);
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useUpdateThicknessPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: UpdateThicknessPricingPayload,
    ): Promise<ThicknessPricing> => {
      const { id, ...body } = payload;
      const response = await apiClient.patch<ThicknessPricing>(
        `/panel-pricing/thickness/${id}`,
        body,
      );
      return response.data;
    },
    onSuccess: () => {
      showSuccess('Закупочная цена обновлена');
      invalidatePricingQueries(queryClient);
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
