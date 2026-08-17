'use client';

import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { SupplierOrder, SupplierOrderStatus } from '../types/hpl';

export type { SupplierOrder, SupplierOrderStatus } from '../types/hpl';

export const supplierOrderStatuses: SupplierOrderStatus[] = [
  'DRAFT',
  'SENT_TO_PRODUCTION',
  'IN_PRODUCTION',
  'READY_FOR_SHIPMENT',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export const supplierOrderStatusLabels: Record<SupplierOrderStatus, string> = {
  DRAFT: 'Черновик',
  SENT_TO_PRODUCTION: 'Отправлено в производство',
  IN_PRODUCTION: 'В производстве',
  READY_FOR_SHIPMENT: 'Готов к отгрузке',
  SHIPPED: 'Отгружено',
  DELIVERED: 'Доставлено',
  CANCELLED: 'Отменён',
};

const LEGACY_STATUS_MAP: Record<string, SupplierOrderStatus> = {
  draft: 'DRAFT',
  submitted: 'SENT_TO_PRODUCTION',
  confirmed: 'IN_PRODUCTION',
  in_transit: 'SHIPPED',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
};

export function normalizeSupplierOrderStatus(
  status?: string | null,
): SupplierOrderStatus | null {
  if (!status) {
    return null;
  }

  if (status in supplierOrderStatusLabels) {
    return status as SupplierOrderStatus;
  }

  return LEGACY_STATUS_MAP[status.toLowerCase()] ?? null;
}

export type UpdateSupplierOrderStatusPayload = {
  id: string;
  status: SupplierOrderStatus;
};

export function useSupplierOrderByDeal(dealId: string) {
  return useQuery({
    queryKey: ['supplier-orders', dealId],
    queryFn: async (): Promise<SupplierOrder | null> => {
      try {
        const response = await apiClient.get<SupplierOrder>(
          `/supplier-orders/${dealId}`,
        );

        return response.data;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return null;
        }

        throw error;
      }
    },
    enabled: Boolean(dealId),
    retry: false,
  });
}

export function useUpdateSupplierOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: UpdateSupplierOrderStatusPayload,
    ): Promise<SupplierOrder> => {
      const response = await apiClient.patch<SupplierOrder>(
        `/supplier-orders/${payload.id}/status`,
        { status: payload.status },
      );

      return response.data;
    },
    onSuccess: (order) => {
      showSuccess('Статус заказа поставщику обновлён');
      void queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      void queryClient.invalidateQueries({
        queryKey: ['supplier-orders', order.dealId],
      });
      void queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
