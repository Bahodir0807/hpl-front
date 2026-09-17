'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { toDecimalNumber } from '../lib/hpl-domain';
import { showError, showSuccess } from '../lib/toast';
import { useI18n } from '@/i18n/provider';
import { normalizePanelTypeCode } from '../lib/hpl-domain';
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

function normalizePanelType(raw: PanelType): PanelType {
  return {
    id: raw.id,
    code: raw.code,
    displayNameRu: raw.displayNameRu,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizePanelColor(raw: PanelColor & {
  colorName?: string | null;
  colorCode?: string | null;
  name?: string | null;
  code?: string | null;
}): PanelColor {
  const colorName =
    raw.colorName?.trim() || raw.name?.trim() || '';
  const colorCode = raw.colorCode?.trim() || raw.code?.trim() || '';

  return {
    id: raw.id,
    supplierId: raw.supplierId,
    name: colorName,
    code: colorCode || null,
    colorName,
    colorCode: colorCode || null,
    hex: raw.hex,
  };
}

function normalizePanelSize(raw: PanelSize): PanelSize {
  const widthMm = toDecimalNumber(raw.widthMm) ?? 0;
  const heightMm = toDecimalNumber(raw.heightMm) ?? 0;

  return {
    id: raw.id,
    widthMm,
    heightMm,
    displayName: raw.displayName,
    areaM2: raw.areaM2,
    sortOrder: raw.sortOrder,
    isActive: raw.isActive,
  };
}

export function usePanelTypes() {
  return useQuery({
    queryKey: ['panel-types'],
    queryFn: async (): Promise<PanelType[]> => {
      const response =
        await apiClient.get<HplListResponse<PanelType>>('/panel-types');

      return unwrapHplList(response.data).map(normalizePanelType);
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

      return unwrapHplList(response.data).map(normalizePanelSize);
    },
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function usePanelColors(supplierId?: string) {
  const scopedSupplierId = supplierId?.trim() || '';
  const loadUnscopedCatalog = supplierId === undefined;

  return useQuery({
    queryKey: ['panel-colors', loadUnscopedCatalog ? 'all' : scopedSupplierId],
    queryFn: async (): Promise<PanelColor[]> => {
      const response = await apiClient.get<HplListResponse<PanelColor>>(
        '/panel-colors',
        {
          params: {
            limit: 100,
            ...(scopedSupplierId ? { supplierId: scopedSupplierId } : {}),
          },
        },
      );

      return unwrapHplList(response.data).map(normalizePanelColor);
    },
    enabled: loadUnscopedCatalog || Boolean(scopedSupplierId),
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useCreatePanelColor() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (payload: CreatePanelColorPayload): Promise<PanelColor> => {
      const response = await apiClient.post<PanelColor>(
        '/panel-colors',
        payload,
      );

      return response.data;
    },
    onSuccess: () => {
      showSuccess(t('panels.toastColorCreated'));
      void queryClient.invalidateQueries({ queryKey: ['panel-colors'] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useUpdatePanelColor() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

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
      showSuccess(t('panels.toastColorUpdated'));
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

function asQualityClass(value: unknown): QualityClass | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as QualityClass;
  const id = record.id?.trim();
  if (!id) {
    return null;
  }

  const normalized: QualityClass = { id };
  if (record.code != null) {
    normalized.code = record.code;
  }
  if (record.nameRu != null) {
    normalized.nameRu = record.nameRu;
  }
  if (record.name != null) {
    normalized.name = record.name;
  }

  return normalized;
}

export function unwrapSupplierQualityClasses(data: unknown): QualityClass[] {
  const arr = toUnknownArray(data);
  const classes: QualityClass[] = [];
  const seen = new Set<string>();

  for (const item of arr) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const record = item as { qualityClass?: unknown };
    const candidate = asQualityClass(record.qualityClass) ?? asQualityClass(item);
    if (!candidate || seen.has(candidate.id)) {
      continue;
    }

    seen.add(candidate.id);
    classes.push(candidate);
  }

  return classes;
}

export function resolveQualityClassesSupplierParam(supplierCode: string): string {
  return supplierCode.trim().toLowerCase();
}

export function resolveQualityClassesPanelTypeParam(
  panelTypeCode?: string,
): string {
  const trimmed = panelTypeCode?.trim() ?? '';
  if (!trimmed) {
    return '';
  }

  return normalizePanelTypeCode(trimmed) ?? trimmed;
}

export function useSupplierQualityClasses(
  supplierCode: string,
  panelTypeCode?: string,
) {
  const code = resolveQualityClassesSupplierParam(supplierCode);
  const panelType = resolveQualityClassesPanelTypeParam(panelTypeCode);

  return useQuery({
    queryKey: ['quality-classes', code, panelType],
    queryFn: async (): Promise<QualityClass[]> => {
      const response = await apiClient.get(
        `/suppliers/${encodeURIComponent(code)}/quality-classes`,
        {
          params: { panelType },
        },
      );
      return unwrapSupplierQualityClasses(response.data);
    },
    enabled: Boolean(code && panelType),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
}
