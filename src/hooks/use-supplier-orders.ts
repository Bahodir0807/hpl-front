'use client';

import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getSupplierOrderErrorMessage } from '../lib/supplier-order-errors';
import { unwrapSupplierOrderList } from '../lib/supplier-order-presentation';
import { showError, showSuccess } from '../lib/toast';
import { SupplierOrder } from '../types/hpl';

export type { SupplierOrder, SupplierOrderStatus } from '../types/hpl';
export {
  canCreateSupplierOrder,
  compactSupplierOrderId,
  getSupplierOrderActions,
  hasSupplierOrderClientDeliveryPermission,
  hasSupplierOrdersManagePermission,
  normalizeSupplierOrderStatus,
  supplierOrderStatusLabels,
  supplierOrderStatuses,
} from '../lib/supplier-order-presentation';

export const supplierOrdersQueryKey = ['supplier-orders'] as const;

export function supplierOrdersByDealQueryKey(dealId: string) {
  return [...supplierOrdersQueryKey, 'deal', dealId] as const;
}

export function supplierOrderDetailQueryKey(id: string) {
  return [...supplierOrdersQueryKey, 'detail', id] as const;
}

export type CreateSupplierOrderPayload = {
  dealId: string;
  supplierId: string;
  orderedAt: string;
  expectedReadyAt: string;
  expectedShipmentAt?: string;
  expectedArrivalAt?: string;
  comment?: string;
};

export type UpdateSupplierOrderDatesPayload = {
  id: string;
  dealId: string;
  expectedReadyAt?: string;
  expectedShipmentAt?: string | null;
  expectedArrivalAt?: string | null;
  comment?: string | null;
};

export type SupplierOrderActionPayload = {
  id: string;
  dealId: string;
};

function isConflictError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 409;
}

function toDatesBody(payload: UpdateSupplierOrderDatesPayload): {
  expectedReadyAt?: string;
  expectedShipmentAt?: string;
  expectedArrivalAt?: string;
  comment?: string;
} {
  return {
    ...(payload.expectedReadyAt ? { expectedReadyAt: payload.expectedReadyAt } : {}),
    ...(payload.expectedShipmentAt
      ? { expectedShipmentAt: payload.expectedShipmentAt }
      : {}),
    ...(payload.expectedArrivalAt
      ? { expectedArrivalAt: payload.expectedArrivalAt }
      : {}),
    ...(payload.comment !== undefined
      ? { comment: payload.comment ?? '' }
      : {}),
  };
}

function invalidateSupplierOrderQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  dealId: string,
  options?: { notifications?: boolean; tasks?: boolean },
): void {
  void queryClient.invalidateQueries({ queryKey: supplierOrdersQueryKey });
  void queryClient.invalidateQueries({
    queryKey: supplierOrdersByDealQueryKey(dealId),
  });
  void queryClient.invalidateQueries({ queryKey: ['deals'] });
  void queryClient.invalidateQueries({ queryKey: ['deals', dealId] });
  void queryClient.invalidateQueries({ queryKey: ['orders'] });

  if (options?.notifications) {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }
  if (options?.tasks) {
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }
}

export function useSupplierOrdersByDeal(dealId: string | null) {
  return useQuery({
    queryKey: supplierOrdersByDealQueryKey(dealId ?? ''),
    queryFn: async (): Promise<SupplierOrder[]> => {
      const response = await apiClient.get<
        SupplierOrder[] | { items?: SupplierOrder[] }
      >(`/deals/${dealId}/supplier-orders`);

      return unwrapSupplierOrderList(response.data);
    },
    enabled: Boolean(dealId),
    retry: false,
  });
}

export function useSupplierOrder(id: string | null) {
  return useQuery({
    queryKey: supplierOrderDetailQueryKey(id ?? ''),
    queryFn: async (): Promise<SupplierOrder> => {
      const response = await apiClient.get<SupplierOrder>(
        `/supplier-orders/${id}`,
      );

      return response.data;
    },
    enabled: Boolean(id),
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useCreateSupplierOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: CreateSupplierOrderPayload,
    ): Promise<SupplierOrder> => {
      const { dealId, ...body } = payload;
      const response = await apiClient.post<SupplierOrder>(
        `/deals/${dealId}/supplier-orders`,
        body,
      );

      return response.data;
    },
    onSuccess: (order) => {
      showSuccess('Заказ поставщику создан');
      invalidateSupplierOrderQueries(queryClient, order.dealId);
    },
    onError: (error, payload) => {
      showError(getSupplierOrderErrorMessage(error));
      if (isConflictError(error)) {
        invalidateSupplierOrderQueries(queryClient, payload.dealId);
      }
    },
  });
}

export function useUpdateSupplierOrderDates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: UpdateSupplierOrderDatesPayload,
    ): Promise<SupplierOrder> => {
      const response = await apiClient.patch<SupplierOrder>(
        `/supplier-orders/${payload.id}/dates`,
        toDatesBody(payload),
      );

      return response.data;
    },
    onSuccess: (order) => {
      showSuccess('Плановые даты обновлены');
      invalidateSupplierOrderQueries(queryClient, order.dealId);
    },
    onError: (error, payload) => {
      showError(getSupplierOrderErrorMessage(error));
      if (isConflictError(error)) {
        invalidateSupplierOrderQueries(queryClient, payload.dealId);
      }
    },
  });
}

export function useConfirmSupplierOrderReady() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: SupplierOrderActionPayload,
    ): Promise<SupplierOrder> => {
      const response = await apiClient.post<SupplierOrder>(
        `/supplier-orders/${payload.id}/confirm-ready`,
      );

      return response.data;
    },
    onSuccess: (order) => {
      showSuccess('Готовность к отгрузке подтверждена');
      invalidateSupplierOrderQueries(queryClient, order.dealId, {
        notifications: true,
      });
    },
    onError: (error, payload) => {
      showError(getSupplierOrderErrorMessage(error));
      if (isConflictError(error)) {
        invalidateSupplierOrderQueries(queryClient, payload.dealId);
      }
    },
  });
}

export function useShipSupplierOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: SupplierOrderActionPayload,
    ): Promise<SupplierOrder> => {
      const response = await apiClient.patch<SupplierOrder>(
        `/supplier-orders/${payload.id}/status`,
        { status: 'SHIPPED' },
      );

      return response.data;
    },
    onSuccess: (order) => {
      showSuccess('Заказ поставщику отгружен');
      invalidateSupplierOrderQueries(queryClient, order.dealId, {
        notifications: true,
      });
    },
    onError: (error, payload) => {
      showError(getSupplierOrderErrorMessage(error));
      if (isConflictError(error)) {
        invalidateSupplierOrderQueries(queryClient, payload.dealId);
      }
    },
  });
}

export function useConfirmSupplierOrderClientDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: SupplierOrderActionPayload,
    ): Promise<SupplierOrder> => {
      const response = await apiClient.post<SupplierOrder>(
        `/supplier-orders/${payload.id}/confirm-client-delivery`,
      );

      return response.data;
    },
    onSuccess: (order) => {
      showSuccess('Доставка клиенту подтверждена');
      invalidateSupplierOrderQueries(queryClient, order.dealId, {
        notifications: true,
        tasks: true,
      });
    },
    onError: (error, payload) => {
      showError(getSupplierOrderErrorMessage(error));
      if (isConflictError(error)) {
        invalidateSupplierOrderQueries(queryClient, payload.dealId);
      }
    },
  });
}
