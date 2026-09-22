'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { useI18n } from '@/i18n/provider';

export type InstallationCommercialStatus =
  | 'DRAFT'
  | 'READY_FOR_APPROVAL'
  | 'APPROVED';

export type InstallationCommercialItem = {
  id: string;
  workTypeCode: string;
  workTypeName: string;
  unit: string;
  quantity: string;
  quantitySource: string;
  selectedRateId: string | null;
  contractorName: string | null;
  pricePerUnit: string | null;
  currency: string | null;
  lineCostTotal: string | null;
  priceStatus: string | null;
  sortOrder: number;
};

export type InstallationCommercialCalculation = {
  id: string;
  leadId: string;
  installationCalculationId: string;
  installationCalculationRevision: number;
  revision: number;
  status: InstallationCommercialStatus;
  staleTechnicalBasis: boolean;
  currentTechnicalRevision: number | null;
  costIncomplete: boolean | null;
  costByCurrency: Array<{ currency: string; amount: string }> | unknown;
  proposedCustomerAmount: string | null;
  proposedCurrency: string | null;
  approvedCustomerAmount: string | null;
  approvedCurrency: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  approverRoleSnapshot: string | null;
  commercialNote: string | null;
  quoteCreated: boolean;
  dealCreated: boolean;
  items: InstallationCommercialItem[];
};

export type InstallationCommercialRateOption = {
  id: string;
  contractorId: string;
  contractorName: string;
  workTypeId: string;
  workTypeCode: string;
  unit: string;
  pricePerUnit: string;
  currency: string;
  isActive: boolean;
};

export type InstallationCommercialWorkspace = {
  applicable: boolean;
  canPrepare: boolean;
  canApprove: boolean;
  canReadCost: boolean;
  staleTechnicalBasis: boolean;
  technicalRevision: number | null;
  quoteCreated: boolean;
  dealCreated: boolean;
  rates: InstallationCommercialRateOption[];
  calculation: InstallationCommercialCalculation | null;
};

export function useInstallationCommercial(leadId: string, enabled = true) {
  return useQuery({
    queryKey: ['leads', leadId, 'installation-commercial'],
    queryFn: async () => {
      const response = await apiClient.get<InstallationCommercialWorkspace>(
        `/leads/${leadId}/installation-commercial`,
      );
      return response.data;
    },
    enabled: enabled && Boolean(leadId),
  });
}

export function useCreateInstallationCommercial(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<InstallationCommercialCalculation>(
        `/leads/${leadId}/installation-commercial`,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['leads', leadId, 'installation-commercial'],
      });
      showSuccess(t('installationPricing.createdToast'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function usePatchInstallationCommercial(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async (payload: {
      expectedRevision: number;
      selections?: Array<{ itemId: string; rateId: string | null }>;
      proposedCustomerAmount?: string | null;
      proposedCurrency?: string | null;
      commercialNote?: string | null;
    }) => {
      const response = await apiClient.patch<InstallationCommercialCalculation>(
        `/leads/${leadId}/installation-commercial`,
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['leads', leadId, 'installation-commercial'],
      });
      showSuccess(t('installationPricing.savedToast'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function useSubmitInstallationCommercial(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async (payload: { expectedRevision: number }) => {
      const response = await apiClient.post(
        `/leads/${leadId}/installation-commercial/submit`,
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['leads', leadId, 'installation-commercial'],
      });
      showSuccess(t('installationPricing.submittedToast'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function useApproveInstallationCommercial(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async (payload: { expectedRevision: number }) => {
      const response = await apiClient.post(
        `/leads/${leadId}/installation-commercial/approve`,
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['leads', leadId, 'installation-commercial'],
      });
      showSuccess(t('installationPricing.approvedToast'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function useRepriceInstallationCommercial(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async (payload: { expectedRevision?: number }) => {
      const response = await apiClient.post(
        `/leads/${leadId}/installation-commercial/revisions`,
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['leads', leadId, 'installation-commercial'],
      });
      showSuccess(t('installationPricing.repricedToast'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}
