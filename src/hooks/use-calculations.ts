'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import {
  CalculationItem,
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
  panelTypeId: string;
  supplierId?: string;
  qualityClassId?: string;
  thicknessMm: number;
  panelSizeId: string;
  colorId?: string;
  requiredAreaM2: number;
  wastePercent?: number;
  sheetCount?: number;
};

export type CreateCalculationItemPayload = {
  panelTypeId: string;
  panelSizeId: string;
  // TODO: Nest CalculationItemDto requires supplierId (@IsUUID). Backend must make it optional for manager-stage submissions (director fills it later).
  supplierId?: string;
  qualityClassId?: string;
  thicknessMm: number;
  colorId?: string;
  requiredAreaM2: string;
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
            panelSizeId: item.panelSizeId,
            // TODO: Nest CalculationItemDto.supplierId is @IsUUID() required.
            // Backend must make supplierId optional for manager-stage submissions, or director fills it later.
            ...(item.supplierId ? { supplierId: item.supplierId } : {}),
            ...(item.qualityClassId
              ? { qualityClassId: item.qualityClassId }
              : {}),
            thicknessMm: item.thicknessMm,
            ...(item.colorId ? { colorId: item.colorId } : {}),
            requiredAreaM2: String(item.requiredAreaM2),
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
