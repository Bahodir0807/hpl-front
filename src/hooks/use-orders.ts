"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { Deal } from "./use-deals";
import { Product } from "./use-inventory";

export type OrderStatus =
  | "DRAFT"
  | "WAITING_PAYMENT"
  | "WAITING_STOCK"
  | "READY_TO_SHIP"
  | "PARTIALLY_SHIPPED"
  | "SHIPPED"
  | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";
export type PaymentRecordStatus = "PENDING" | "CONFIRMED" | "REJECTED";
export type DeliveryStatus = "PLANNED" | "DELIVERED" | "CANCELLED";

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  deliveredQuantity: number;
  unitPrice: string | number;
  totalPrice: string | number;
  product?: Product;
};

export type Payment = {
  id: string;
  orderId: string;
  amount: string | number;
  status: PaymentRecordStatus;
  paymentDate?: string | null;
  comment?: string | null;
  fileId?: string | null;
  createdById: string;
  createdAt: string;
};

export type DeliveryItem = {
  id: string;
  deliveryId: string;
  orderItemId: string;
  quantity: number;
};

export type Delivery = {
  id: string;
  orderId: string;
  deliveryDate: string;
  recipient?: string | null;
  trackingNumber?: string | null;
  status: DeliveryStatus;
  items: DeliveryItem[];
  createdAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  dealId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: string | number;
  paidAmount: string | number;
  remainingAmount: string | number;
  deliveryAddress?: string | null;
  paymentTerms?: string | null;
  promisedDate?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deal?: Deal;
  items?: OrderItem[];
  payments?: Payment[];
  deliveries?: Delivery[];
};

export type OrdersFilter = {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  dealId?: string;
  page?: number;
  limit?: number;
};

export type OrdersListResponse = {
  items: Order[];
  total: number;
  page: number;
  limit: number;
};

export type CreateOrderFromDealPayload = {
  dealId: string;
  deliveryAddress?: string;
  paymentTerms?: string;
  promisedDate?: string;
};

export type AddPaymentPayload = {
  orderId: string;
  amount: number;
  paymentDate?: string;
  comment?: string;
  fileId?: string;
};

export type ConfirmPaymentPayload = {
  paymentId: string;
  status: Extract<PaymentRecordStatus, "CONFIRMED" | "REJECTED">;
};

export type CreateDeliveryPayload = {
  orderId: string;
  deliveryDate: string;
  recipient?: string;
  trackingNumber?: string;
  items: { orderItemId: string; quantity: number }[];
};

export function useOrders(filters: OrdersFilter) {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: async (): Promise<OrdersListResponse> => {
      const response = await apiClient.get<OrdersListResponse>("/orders", {
        params: filters,
      });

      return response.data;
    },
  });
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: async (): Promise<Order> => {
      const response = await apiClient.get<Order>(`/orders/${id}`);

      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateOrderFromDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateOrderFromDealPayload): Promise<Order> => {
      const response = await apiClient.post<Order>(
        "/orders/from-deal",
        payload,
      );

      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-balances"] });
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddPaymentPayload): Promise<Payment> => {
      const response = await apiClient.post<Payment>(
        `/orders/${payload.orderId}/payments`,
        {
          amount: payload.amount,
          paymentDate: payload.paymentDate,
          comment: payload.comment,
          fileId: payload.fileId,
        },
      );

      return response.data;
    },
    onSuccess: (_payment, payload) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({
        queryKey: ["orders", payload.orderId],
      });
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ConfirmPaymentPayload): Promise<Order> => {
      const response = await apiClient.patch<Order>(
        `/orders/payments/${payload.paymentId}/confirm`,
        { status: payload.status },
      );

      return response.data;
    },
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["orders", order.id] });
    },
  });
}

export function useCreateDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDeliveryPayload): Promise<Delivery> => {
      const response = await apiClient.post<Delivery>(
        `/orders/${payload.orderId}/deliveries`,
        {
          deliveryDate: payload.deliveryDate,
          recipient: payload.recipient,
          trackingNumber: payload.trackingNumber,
          items: payload.items,
        },
      );

      return response.data;
    },
    onSuccess: (_delivery, payload) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({
        queryKey: ["orders", payload.orderId],
      });
      void queryClient.invalidateQueries({ queryKey: ["stock-balances"] });
    },
  });
}
