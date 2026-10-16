'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { useI18n } from '@/i18n/provider';

export type FacadeAreaSource = 'ENGINEER_ENTERED' | 'HPL_QUALIFICATION';
export type FacadeAreaConfirmationMethod = 'SITE_VISIT' | 'REMOTE';
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

export type FacadeCalculationArea = {
  id: string | null;
  label: string;
  sortOrder: number;
  hplThicknessMm: string | null;
  configCode: string;
  normSetCode: string | null;
  suggestedAreaM2: string | null;
  suggestedAreaSource: FacadeAreaSource | null;
  confirmedAreaM2: string | null;
  confirmedById: string | null;
  confirmedByRole: string | null;
  confirmationMethod: FacadeAreaConfirmationMethod | null;
  confirmedAt: string | null;
  confirmed: boolean;
  items: FacadeCalculationItem[];
};

export type FacadeAreaSuggestion = {
  label: string;
  hplThicknessMm: number | null;
  suggestedAreaM2: string | null;
  suggestedAreaSource: FacadeAreaSource | null;
  ambiguous: boolean;
  configCode: string | null;
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
  hplThicknessMm?: number | null;
  insulationThicknessMm?: number | null;
  fastening?: 'DRY' | 'ADHESIVE' | null;
  legacy?: boolean;
  selectable?: boolean;
  norms?: Array<{
    code: string;
    nameRu: string;
    nameEn: string;
    nameUz: string;
    unit: string;
    qtyPerM2: string | null;
    sortOrder: number;
    category: string;
  }>;
};

export type FacadeCalculationItem = {
  id: string;
  areaId?: string | null;
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
  areas?: FacadeCalculationArea[];
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
  suggestedAreas?: FacadeAreaSuggestion[];
  canConfirmRemote?: boolean;
  hplThicknessesMm?: number[];
  thicknessConflict?: boolean;
  configs: FacadeConfig[];
  catalog: FacadeMaterial[];
  calculation: FacadeCalculation | null;
  quoteCreated: boolean;
  dealCreated: boolean;
};

export function useFacadeWorkspace(
  leadId: string,
  enabled = true,
  remoteConfirmation = false,
) {
  return useQuery({
    queryKey: ['engineering', 'facade', leadId],
    queryFn: async () => {
      const response = await apiClient.get<FacadeWorkspace>(
        `/engineering/leads/${leadId}/facade${remoteConfirmation ? '/remote-workspace' : ''}`,
      );
      return response.data;
    },
    enabled: enabled && Boolean(leadId),
  });
}

export function useFacadeSaveAreas(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (payload: {
      expectedRevision: number;
      areas: Array<{
        id?: string;
        label: string;
        hplThicknessMm: string;
        configCode: string;
        suggestedAreaM2?: string | null;
        suggestedAreaSource?: FacadeAreaSource;
        sortOrder?: number;
      }>;
    }) => {
      const response = await apiClient.put<FacadeCalculation>(
        `/engineering/leads/${leadId}/facade/areas`,
        payload,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<FacadeWorkspace>(
        ['engineering', 'facade', leadId],
        (current) => (current ? { ...current, calculation: data } : current),
      );
      showSuccess(t('engineering.facadeSaved'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function useFacadeConfirmArea(
  leadId: string,
  remote = false,
) {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (payload: {
      areaId: string;
      confirmedAreaM2: string;
      expectedRevision: number;
    }) => {
      const response = await apiClient.post<FacadeCalculation>(
        `/engineering/leads/${leadId}/facade/areas/${payload.areaId}/${remote ? 'remote-confirm' : 'confirm'}`,
        {
          confirmedAreaM2: payload.confirmedAreaM2,
          expectedRevision: payload.expectedRevision,
        },
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<FacadeWorkspace>(
        ['engineering', 'facade', leadId],
        (current) => (current ? { ...current, calculation: data } : current),
      );
      showSuccess(t('engineering.facadeAreaConfirmed'));
    },
    onError: (error) => showError(getErrorMessage(error)),
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
      confirmThicknessMismatch?: boolean;
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
