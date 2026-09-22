'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { useI18n } from '@/i18n/provider';

export type FacadeCommercialStatus =
  | 'DRAFT'
  | 'READY_FOR_APPROVAL'
  | 'APPROVED';

export type FacadeCommercialItem = {
  id: string;
  materialCode: string;
  materialName: string;
  category: string;
  unit: string;
  finalQty: string;
  excludedFromSubsystemCommercialCost: boolean;
  selectedOfferId: string | null;
  offerSnapshot: Record<string, unknown> | null;
  purchasePrice: string | null;
  purchaseCurrency: string | null;
  linePurchaseTotal: string | null;
  priceStatus: string | null;
  fxRate: string | null;
  fxFromCurrency: string | null;
  fxToCurrency: string | null;
  sortOrder: number;
};

export type FacadeCommercialCalculation = {
  id: string;
  leadId: string;
  facadeCalculationId: string;
  facadeCalculationRevision: number;
  revision: number;
  status: FacadeCommercialStatus;
  staleTechnicalBasis: boolean;
  currentTechnicalRevision: number | null;
  claddingAreaM2: string | null;
  configCode: string | null;
  normSetCode: string | null;
  procurementIncomplete: boolean | null;
  procurementByCurrency: Array<{ currency: string; amount: string }> | unknown;
  fxSnapshots: unknown;
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
  items: FacadeCommercialItem[];
};

export type FacadeCommercialOfferOption = {
  id: string;
  materialId: string;
  materialCode: string;
  supplierId: string;
  supplierName: string;
  purchasePrice: string;
  currency: string;
  unit: string;
  isActive: boolean;
  validFrom: string;
  validTo: string | null;
  availability: string | null;
  leadTimeDays: number | null;
};

export type FacadeCommercialWorkspace = {
  canPrepare: boolean;
  canApprove: boolean;
  canReadPurchase: boolean;
  staleTechnicalBasis: boolean;
  technicalRevision: number | null;
  snapshotTechnicalRevision: number | null;
  quoteCreated: boolean;
  dealCreated: boolean;
  offers: FacadeCommercialOfferOption[];
  calculation: FacadeCommercialCalculation | null;
};

export function useFacadeCommercial(leadId: string, enabled = true) {
  return useQuery({
    queryKey: ['leads', leadId, 'facade-commercial'],
    queryFn: async () => {
      const response = await apiClient.get<FacadeCommercialWorkspace>(
        `/leads/${leadId}/facade-commercial`,
      );
      return response.data;
    },
    enabled: enabled && Boolean(leadId),
  });
}

export function useCreateFacadeCommercial(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<FacadeCommercialCalculation>(
        `/leads/${leadId}/facade-commercial`,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['leads', leadId, 'facade-commercial'],
      });
      showSuccess(t('facadePricing.createdToast'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function usePatchFacadeCommercial(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async (payload: {
      expectedRevision: number;
      selections?: Array<{ itemId: string; offerId: string | null }>;
      proposedCustomerAmount?: string | null;
      proposedCurrency?: string | null;
      commercialNote?: string | null;
    }) => {
      const response = await apiClient.patch<FacadeCommercialCalculation>(
        `/leads/${leadId}/facade-commercial`,
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['leads', leadId, 'facade-commercial'],
      });
      showSuccess(t('facadePricing.savedToast'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function useSubmitFacadeCommercial(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async (expectedRevision: number) => {
      const response = await apiClient.post<FacadeCommercialCalculation>(
        `/leads/${leadId}/facade-commercial/submit`,
        { expectedRevision },
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['leads', leadId, 'facade-commercial'],
      });
      showSuccess(t('facadePricing.submittedToast'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function useApproveFacadeCommercial(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async (expectedRevision: number) => {
      const response = await apiClient.post<FacadeCommercialCalculation>(
        `/leads/${leadId}/facade-commercial/approve`,
        { expectedRevision },
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['leads', leadId, 'facade-commercial'],
      });
      showSuccess(t('facadePricing.approvedToast'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function useRepriceFacadeCommercial(leadId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async (expectedRevision?: number) => {
      const response = await apiClient.post<FacadeCommercialCalculation>(
        `/leads/${leadId}/facade-commercial/revisions`,
        { expectedRevision },
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['leads', leadId, 'facade-commercial'],
      });
      showSuccess(t('facadePricing.repricedToast'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}
