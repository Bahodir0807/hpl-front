'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { useI18n } from '@/i18n/provider';

export type InstallationCatalogWorkType = {
  id: string;
  code: string;
  nameRu: string;
  nameUz: string;
  nameEn: string;
  description: string | null;
  unit: string;
  category: string;
  isActive: boolean;
};

export type InstallationCatalogContractor = {
  id: string;
  name: string;
  type: 'INTERNAL_CREW' | 'EXTERNAL_CONTRACTOR';
  contactName: string | null;
  phone: string | null;
  note: string | null;
  supplierId: string | null;
  supplierName: string | null;
  isActive: boolean;
};

export type InstallationCatalogRate = {
  id: string;
  contractorId: string;
  contractorName: string;
  workTypeId: string;
  workTypeCode: string;
  workTypeName: string;
  unit: string;
  pricePerUnit: string;
  currency: string;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  note: string | null;
};

export function useInstallationWorkTypes() {
  return useQuery({
    queryKey: ['references', 'installation-work-types'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: InstallationCatalogWorkType[] }>(
        '/references/installation-work-types?includeInactive=true',
      );
      return response.data;
    },
  });
}

export function useInstallationContractors() {
  return useQuery({
    queryKey: ['references', 'installation-contractors'],
    queryFn: async () => {
      const response = await apiClient.get<{
        items: InstallationCatalogContractor[];
      }>('/references/installation-contractors?includeInactive=true');
      return response.data;
    },
  });
}

export function useInstallationRates() {
  return useQuery({
    queryKey: ['references', 'installation-rates'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: InstallationCatalogRate[] }>(
        '/references/installation-rates?includeInactive=true',
      );
      return response.data;
    },
  });
}

export function useCreateInstallationWorkType() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await apiClient.post(
        '/references/installation-work-types',
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['references', 'installation-work-types'],
      });
      showSuccess(t('installationPricing.created'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function useUpdateInstallationWorkType() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Record<string, unknown>) => {
      const response = await apiClient.patch(
        `/references/installation-work-types/${id}`,
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['references', 'installation-work-types'],
      });
      showSuccess(t('installationPricing.saved'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function useCreateInstallationContractor() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await apiClient.post(
        '/references/installation-contractors',
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['references', 'installation-contractors'],
      });
      showSuccess(t('installationPricing.created'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function useUpdateInstallationContractor() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Record<string, unknown>) => {
      const response = await apiClient.patch(
        `/references/installation-contractors/${id}`,
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['references', 'installation-contractors'],
      });
      showSuccess(t('installationPricing.saved'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function useCreateInstallationRate() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await apiClient.post(
        '/references/installation-rates',
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['references', 'installation-rates'],
      });
      showSuccess(t('installationPricing.created'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}

export function useUpdateInstallationRate() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Record<string, unknown>) => {
      const response = await apiClient.patch(
        `/references/installation-rates/${id}`,
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['references', 'installation-rates'],
      });
      showSuccess(t('installationPricing.saved'));
    },
    onError: (error) => showError(getErrorMessage(error)),
  });
}
