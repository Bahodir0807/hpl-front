'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { useI18n } from '@/i18n/provider';

export type FacadeAreaSource = 'ENGINEER_ENTERED' | 'HPL_QUALIFICATION';
export type FacadeCalculationStatus = 'DRAFT' | 'CALCULATED' | 'UNSUPPORTED';

export type FacadeMaterial = {
  id: string;
  code: string;
  nameRu: string;
  nameEn: string;
  nameUz: string;
  category: string;
  unit: string;
  spec: Record<string, unknown> | null;
  hasPrice: boolean;
  price: string | null;
};

export type FacadeConfig = {
  id: string;
  code: string;
  nameRu: string;
  nameEn: string;
  nameUz: string;
  isCalculable: boolean;
  panelWidthMm: number | null;
  panelHeightMm: number | null;
  panelAreaM2: string | null;
};

export type FacadeCalculationItem = {
  id: string;
  materialId: string | null;
  materialCode: string;
  materialName: string;
  category: string;
  unit: string;
  spec: Record<string, unknown> | null;
  qtyPerM2: string | null;
  calculatedQty: string | null;
  finalQty: string;
  isManual: boolean;
  isExtra: boolean;
  note: string | null;
  sortOrder: number;
};

export type FacadeCalculation = {
  id: string;
  leadId: string;
  assignmentId: string | null;
  engineerId: string;
  status: FacadeCalculationStatus;
  revision: number;
  claddingAreaM2: string | null;
  areaSource: FacadeAreaSource | null;
  notes: string | null;
  configCode: string;
  configIsCalculable: boolean;
  normSetCode: string | null;
  ready: boolean;
  items: FacadeCalculationItem[];
  quoteCreated?: boolean;
  dealCreated?: boolean;
};

export type FacadeWorkspace = {
  applicable: boolean;
  reason: 'INSTALLATION_ONLY' | 'SUBSYSTEM_NOT_REQUESTED' | null;
  canEdit: boolean;
  assignmentId: string | null;
  suggestedArea: {
    value: string | null;
    source: FacadeAreaSource | null;
    ambiguous: boolean;
    candidates?: string[];
  };
  configs: FacadeConfig[];
  catalog: FacadeMaterial[];
  calculation: FacadeCalculation | null;
  quoteCreated: boolean;
  dealCreated: boolean;
};

export function useFacadeWorkspace(leadId: string, enabled = true) {
  return useQuery({
    queryKey: ['engineering', 'facade', leadId],
    queryFn: async () => {
      const response = await apiClient.get<FacadeWorkspace>(
        `/engineering/leads/${leadId}/facade`,
      );
      return response.data;
    },
    enabled: enabled && Boolean(leadId),
  });
}

export function useFacadeCalculate(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (payload: {
      configCode: string;
      claddingAreaM2: string;
      areaSource?: FacadeAreaSource;
      confirmRecalculate?: boolean;
      expectedRevision?: number;
    }) => {
      const response = await apiClient.post<FacadeCalculation>(
        `/engineering/leads/${leadId}/facade/calculate`,
        payload,
      );
      return response.data;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData<FacadeWorkspace>(
        ['engineering', 'facade', leadId],
        (current) =>
          current
            ? {
                ...current,
                calculation: data,
                quoteCreated: data.quoteCreated ?? false,
                dealCreated: data.dealCreated ?? false,
              }
            : current,
      );
      if (data.status === 'UNSUPPORTED') {
        showSuccess(t('engineering.facadeUnsupportedSaved'));
      } else {
        showSuccess(t('engineering.facadeCalculated'));
      }
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useFacadeSaveDraft(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (payload: {
      expectedRevision: number;
      notes?: string | null;
      items?: Array<{ id: string; finalQty: string; note?: string | null }>;
    }) => {
      const response = await apiClient.patch<FacadeCalculation>(
        `/engineering/leads/${leadId}/facade`,
        payload,
      );
      return response.data;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData<FacadeWorkspace>(
        ['engineering', 'facade', leadId],
        (current) =>
          current ? { ...current, calculation: data } : current,
      );
      showSuccess(t('engineering.facadeSaved'));
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useFacadeAddItem(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (payload: {
      materialId: string;
      finalQty: string;
      note?: string | null;
      expectedRevision: number;
    }) => {
      const response = await apiClient.post<FacadeCalculation>(
        `/engineering/leads/${leadId}/facade/items`,
        payload,
      );
      return response.data;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData<FacadeWorkspace>(
        ['engineering', 'facade', leadId],
        (current) =>
          current ? { ...current, calculation: data } : current,
      );
      showSuccess(t('engineering.facadeItemAdded'));
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
