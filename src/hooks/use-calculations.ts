'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import {
  CalculationPreview,
  CalculationSession,
  HplListResponse,
  unwrapHplList,
} from '../types/hpl';

export type {
  CalculationItem,
  CalculationPreview,
  CalculationSession,
} from '../types/hpl';

export type CalculationPreviewPayload = {
  panelTypeId?: string;
  panelSizeId?: string;
  customWidthMm?: number;
  customHeightMm?: number;
  supplierId?: string;
  qualityClassId?: string;
  thicknessMm?: number | string;
  requiredAreaM2?: number;
  colorId?: string;
  leadId?: string;
  purchasePricePerM2Cny?: string;
};

export type CreateCalculationItemPayload = {
  panelTypeId: string;
  panelSizeId?: string;
  customWidthMm?: number;
  customHeightMm?: number;
  supplierId?: string;
  qualityClassId?: string;
  thicknessMm: number | string;
  colorId?: string;
  requiredAreaM2: string;
  purchasePricePerM2Cny?: string;
};

export type CreateCalculationPayload = {
  leadId: string;
  notes?: string;
  items: CreateCalculationItemPayload[];
};

export function useCalculationPreview() {
  return useMutation({
    mutationFn: async (
      payload: CalculationPreviewPayload,
    ): Promise<CalculationPreview> => {
      const response = await apiClient.post<CalculationPreview>(
        '/calculations/preview',
        payload,
      );

      return response.data;
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useCreateCalculation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: CreateCalculationPayload,
    ): Promise<CalculationSession> => {
      const response = await apiClient.post<CalculationSession>(
        '/calculations',
        {
          leadId: payload.leadId,
          ...(payload.notes ? { notes: payload.notes } : {}),
          items: payload.items.map((item) => ({
            panelTypeId: item.panelTypeId,
            ...(item.panelSizeId ? { panelSizeId: item.panelSizeId } : {}),
            ...(item.customWidthMm != null
              ? { customWidthMm: item.customWidthMm }
              : {}),
            ...(item.customHeightMm != null
              ? { customHeightMm: item.customHeightMm }
              : {}),
            ...(item.supplierId ? { supplierId: item.supplierId } : {}),
            ...(item.qualityClassId
              ? { qualityClassId: item.qualityClassId }
              : {}),
            thicknessMm: item.thicknessMm,
            ...(item.colorId ? { colorId: item.colorId } : {}),
            requiredAreaM2: String(item.requiredAreaM2),
            ...(item.purchasePricePerM2Cny
              ? { purchasePricePerM2Cny: item.purchasePricePerM2Cny }
              : {}),
          })),
        },
      );

      return response.data;
    },
    onSuccess: (calculation) => {
      showSuccess('Расчёт сохранён');
      void queryClient.invalidateQueries({ queryKey: ['calculations'] });
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', calculation.leadId],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useFinalizeCalculation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<CalculationSession> => {
      const response = await apiClient.post<CalculationSession>(
        `/calculations/${id}/finalize`,
      );

      return response.data;
    },
    onSuccess: (calculation) => {
      void queryClient.invalidateQueries({ queryKey: ['calculations'] });
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', calculation.leadId],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useCalculationsByLead(leadId: string) {
  return useQuery({
    queryKey: ['calculations', leadId],
    queryFn: async (): Promise<CalculationSession[]> => {
      const response = await apiClient.get<HplListResponse<CalculationSession>>(
        '/calculations',
        {
          params: { leadId },
        },
      );

      return unwrapHplList(response.data);
    },
    enabled: Boolean(leadId),
  });
}
