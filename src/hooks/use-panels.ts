'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import {
  HplListResponse,
  PanelColor,
  PanelSize,
  PanelType,
  QualityClass,
  Supplier,
  unwrapHplList,
} from '../types/hpl';

export type {
  PanelColor,
  PanelSize,
  PanelType,
  QualityClass,
  Supplier,
} from '../types/hpl';

const REFERENCE_STALE_TIME = 5 * 60 * 1000;

export type CreatePanelColorPayload = {
  supplierId: string;
  name: string;
  code?: string;
  hex?: string;
};

export type UpdatePanelColorPayload = {
  id: string;
  supplierId?: string;
  name?: string;
  code?: string | null;
  hex?: string | null;
};

export function usePanelTypes() {
  return useQuery({
    queryKey: ['panel-types'],
    queryFn: async (): Promise<PanelType[]> => {
      const response =
        await apiClient.get<HplListResponse<PanelType>>('/panel-types');

      return unwrapHplList(response.data);
    },
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function usePanelSizes() {
  return useQuery({
    queryKey: ['panel-sizes'],
    queryFn: async (): Promise<PanelSize[]> => {
      const response =
        await apiClient.get<HplListResponse<PanelSize>>('/panel-sizes');

      return unwrapHplList(response.data);
    },
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function usePanelColors(supplierId?: string) {
  return useQuery({
    queryKey: ['panel-colors', supplierId],
    queryFn: async (): Promise<PanelColor[]> => {
      const response = await apiClient.get<HplListResponse<PanelColor>>(
        '/panel-colors',
        {
          params: supplierId ? { supplierId } : undefined,
        },
      );

      return unwrapHplList(response.data);
    },
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useCreatePanelColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePanelColorPayload): Promise<PanelColor> => {
      const response = await apiClient.post<PanelColor>(
        '/panel-colors',
        payload,
      );

      return response.data;
    },
    onSuccess: () => {
      showSuccess('Цвет создан');
      void queryClient.invalidateQueries({ queryKey: ['panel-colors'] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useUpdatePanelColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePanelColorPayload): Promise<PanelColor> => {
      const { id, ...body } = payload;
      const response = await apiClient.patch<PanelColor>(
        `/panel-colors/${id}`,
        body,
      );

      return response.data;
    },
    onSuccess: () => {
      showSuccess('Цвет обновлён');
      void queryClient.invalidateQueries({ queryKey: ['panel-colors'] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useSuppliers(enabled = true) {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async (): Promise<Supplier[]> => {
      const response = await apiClient.get<HplListResponse<Supplier>>(
        '/references/suppliers',
      );

      return unwrapHplList(response.data);
    },
    enabled,
    staleTime: REFERENCE_STALE_TIME,
  });
}

function toUnknownArray(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  const record = data as Record<string, unknown>;
  const nested = [record.items, record.data, record.qualityClasses, record.classes];

  for (const candidate of nested) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (candidate && typeof candidate === 'object') {
      const items = (candidate as { items?: unknown }).items;
      if (Array.isArray(items)) {
        return items;
      }
    }
  }

  return unwrapHplList(data as HplListResponse<unknown>);
}

function unwrapQualityClasses(data: unknown): QualityClass[] {
  const arr = toUnknownArray(data);
  const first = arr[0];

  if (
    first &&
    typeof first === 'object' &&
    'qualityClass' in first &&
    (first as { qualityClass?: unknown }).qualityClass
  ) {
    return arr
      .map((item) =>
        item && typeof item === 'object'
          ? (item as { qualityClass?: QualityClass | null }).qualityClass
          : null,
      )
      .filter((item): item is QualityClass => Boolean(item));
  }

  return arr.filter((item): item is QualityClass => Boolean(item));
}

export function useSupplierQualityClasses(
  supplierCode: string,
  panelTypeCode?: string,
) {
  const code = supplierCode.trim().toLowerCase();
  const panelType = panelTypeCode?.trim().toLowerCase();

  return useQuery({
    queryKey: ['quality-classes', code, panelType],
    queryFn: async (): Promise<QualityClass[]> => {
      const response = await apiClient.get(
        `/suppliers/${code}/quality-classes`,
        {
          params: panelType ? { panelType } : undefined,
        },
      );
      return unwrapQualityClasses(response.data);
    },
    enabled: Boolean(code && panelType),
    staleTime: REFERENCE_STALE_TIME,
  });
}
