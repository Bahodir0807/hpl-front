'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { useI18n } from '@/i18n/provider';

export type FacadeOffer = {
  id: string;
  materialId: string;
  supplierId: string;
  purchasePrice: string;
  currency: string;
  unit: string;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  availability: string | null;
  leadTimeDays: number | null;
  supplierSku: string | null;
  note: string | null;
  material: {
    code: string;
    nameRu: string;
    nameEn: string;
    nameUz: string;
    category: string;
    unit: string;
  };
  supplier: {
    code: string;
    name: string;
  };
};

export type FacadeOfferCatalog = {
  items: FacadeOffer[];
  materials: Array<{
    id: string;
    code: string;
    nameRu: string;
    nameEn: string;
    nameUz: string;
    category: string;
    unit: string;
  }>;
  suppliers: Array<{ id: string; code: string; name: string }>;
};

export type FacadeOfferPayload = {
  materialId: string;
  supplierId: string;
  purchasePrice: string;
  currency: string;
  unit: string;
  validFrom: string;
  validTo?: string | null;
  isActive?: boolean;
  availability?: string | null;
  leadTimeDays?: number | null;
  supplierSku?: string | null;
  note?: string | null;
};

export function useFacadeOffers(enabled = true) {
  return useQuery({
    queryKey: ['references', 'facade-offers'],
    queryFn: async () => {
      const response = await apiClient.get<FacadeOfferCatalog>(
        '/references/facade-offers',
      );
      return response.data;
    },
    enabled,
  });
}

export function useCreateFacadeOffer() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async (payload: FacadeOfferPayload) => {
      const response = await apiClient.post<FacadeOffer>(
        '/references/facade-offers',
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['references', 'facade-offers'],
      });
      showSuccess(t('facadePricing.created'));
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useUpdateFacadeOffer() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<FacadeOfferPayload>) => {
      const { id, ...payload } = input;
      const response = await apiClient.patch<FacadeOffer>(
        `/references/facade-offers/${id}`,
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['references', 'facade-offers'],
      });
      showSuccess(t('facadePricing.saved'));
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
