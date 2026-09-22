'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { useI18n } from '@/i18n/provider';

export type InstallationQuantitySource =
  | 'MANUAL'
  | 'CONFIRMED_AREA'
  | 'APPROVED_NORM';

export type InstallationCalculationStatus = 'DRAFT' | 'READY';

export type InstallationWorkType = {
  id: string;
  code: string;
  nameRu: string;
  nameEn: string;
  nameUz: string;
  description: string | null;
  unit: string;
  category: string;
};

export type InstallationCalculationItem = {
  id: string;
  workTypeId: string | null;
  workTypeCode: string;
  workTypeName: string;
  unit: string;
  quantity: string;
  quantitySource: InstallationQuantitySource;
  note: string | null;
  sortOrder: number;
};

export type InstallationCalculation = {
  id: string;
  leadId: string;
  assignmentId: string | null;
  engineerId: string;
  status: InstallationCalculationStatus;
  revision: number;
  note: string | null;
  ready: boolean;
  items: InstallationCalculationItem[];
  quoteCreated?: boolean;
  dealCreated?: boolean;
};

export type InstallationWorkspace = {
  applicable: boolean;
  reason: 'INSTALLATION_NOT_REQUESTED' | null;
  canEdit: boolean;
  assignmentId: string | null;
  suggestedArea: {
    value: string | null;
    source: string | null;
    ambiguous: boolean;
    candidates?: string[];
  };
  approvedNormAvailable: boolean;
  workTypes: InstallationWorkType[];
  calculation: InstallationCalculation | null;
  quoteCreated: boolean;
  dealCreated: boolean;
};

export function useInstallationWorkspace(leadId: string, enabled = true) {
  return useQuery({
    queryKey: ['engineering', 'installation', leadId],
    queryFn: async () => {
      const response = await apiClient.get<InstallationWorkspace>(
        `/engineering/leads/${leadId}/installation`,
      );
      return response.data;
    },
    enabled: enabled && Boolean(leadId),
  });
}

export function useInstallationSaveDraft(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (payload: {
      expectedRevision?: number;
      note?: string | null;
      items?: Array<{
        id?: string;
        workTypeId: string;
        quantity: string;
        quantitySource?: InstallationQuantitySource;
        note?: string | null;
        sortOrder?: number;
      }>;
    }) => {
      const response = await apiClient.patch<InstallationCalculation>(
        `/engineering/leads/${leadId}/installation`,
        payload,
      );
      return response.data;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData<InstallationWorkspace>(
        ['engineering', 'installation', leadId],
        (current) =>
          current ? { ...current, calculation: data } : current,
      );
      showSuccess(t('engineering.installationSaved'));
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useInstallationComplete(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (payload: { expectedRevision: number }) => {
      const response = await apiClient.post<InstallationCalculation>(
        `/engineering/leads/${leadId}/installation/complete`,
        payload,
      );
      return response.data;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData<InstallationWorkspace>(
        ['engineering', 'installation', leadId],
        (current) =>
          current ? { ...current, calculation: data } : current,
      );
      showSuccess(t('engineering.installationCompleted'));
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
