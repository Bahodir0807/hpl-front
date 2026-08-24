"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { getErrorMessage } from "../lib/errors";
import { showError, showSuccess } from "../lib/toast";

export type ProductStatus = "ACTIVE" | "ARCHIVED" | "OUT_OF_STOCK";
export type ProductPriceType = "BASE" | "PURCHASE" | "WHOLESALE" | "RETAIL";
export type ExpectedReceiptStatus =
  "PENDING" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export type ProductPrice = {
  id: string;
  productId: string;
  type: ProductPriceType;
  amount: string | number;
  currency: string;
  validFrom: string;
  validTo?: string | null;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  brandId: string;
  collectionId?: string | null;
  supplierId?: string | null;
  decorCode?: string | null;
  colorName?: string | null;
  surface?: string | null;
  thickness: number | string;
  length: number;
  width: number;
  sheetArea: number | string;
  unit: string;
  status: ProductStatus;
  prices?: ProductPrice[];
  brand?: { id: string; name: string } | null;
  supplier?: { id: string; name: string; code?: string } | null;
  collection?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductsFilter = {
  search?: string;
  brandId?: string;
  collectionId?: string;
  supplierId?: string;
  status?: ProductStatus;
  decorCode?: string;
  colorName?: string;
  surface?: string;
  thickness?: number;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
};

export type ProductsListResponse = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
};

export type StockBalance = {
  id: string;
  productId: string;
  onHand: number;
  reserved: number;
  available: number;
  product?: Product;
  updatedAt: string;
};

export type StockBalancesResponse = {
  items: StockBalance[];
  total: number;
  page: number;
  limit: number;
};

export type ExpectedReceiptItem = {
  id: string;
  expectedReceiptId: string;
  productId: string;
  quantity: number;
  receivedQuantity: number;
  product?: Product;
};

export type ExpectedReceipt = {
  id: string;
  supplierId?: string | null;
  expectedDate: string;
  status: ExpectedReceiptStatus;
  supplier?: { id: string; name: string; code?: string } | null;
  items: ExpectedReceiptItem[];
  createdAt: string;
  updatedAt: string;
};

export type ExpectedReceiptsResponse = {
  items: ExpectedReceipt[];
  total: number;
  page: number;
  limit: number;
};

export type CreateExpectedReceiptPayload = {
  supplierId?: string;
  expectedDate: string;
  items: { productId: string; quantity: number }[];
};

export type ReceiveExpectedReceiptPayload = {
  id: string;
  comment?: string;
  items: {
    itemId: string;
    receivedQuantity?: number;
    acceptedQuantity?: number;
    rejectedQuantity?: number;
  }[];
};

export type ProductFacets = {
  collections: { id: string; name: string; count: number }[];
  thicknesses: { value: number; count: number }[];
  surfaces: { value: string; count: number }[];
  brands: { id: string; name: string; count: number }[];
};

export function useProductFacets() {
  return useQuery({
    queryKey: ["products", "facets"],
    queryFn: async (): Promise<ProductFacets> => {
      const response = await apiClient.get<ProductFacets>("/products/facets");

      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProducts(filters: ProductsFilter) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: async (): Promise<ProductsListResponse> => {
      const response = await apiClient.get<ProductsListResponse>("/products", {
        params: filters,
      });

      return response.data;
    },
  });
}

export function useStockBalances(enabled = true) {
  return useQuery({
    queryKey: ["stock-balances"],
    queryFn: async (): Promise<StockBalancesResponse> => {
      const response = await apiClient.get<StockBalancesResponse>(
        "/inventory/balances",
        { params: { limit: 100 } },
      );

      return response.data;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useExpectedReceipts(enabled = true) {
  return useQuery({
    queryKey: ["expected-receipts"],
    queryFn: async (): Promise<ExpectedReceiptsResponse> => {
      const response = await apiClient.get<ExpectedReceiptsResponse>(
        "/inventory/expected-receipts",
      );

      return response.data;
    },
    enabled,
    retry: false,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateExpectedReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: CreateExpectedReceiptPayload,
    ): Promise<ExpectedReceipt> => {
      const response = await apiClient.post<ExpectedReceipt>(
        "/inventory/expected-receipts",
        payload,
      );

      return response.data;
    },
    onSuccess: () => {
      showSuccess("Ожидаемый приход создан");
      void queryClient.invalidateQueries({ queryKey: ["expected-receipts"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-balances"] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useReceiveExpectedReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: ReceiveExpectedReceiptPayload,
    ): Promise<ExpectedReceipt> => {
      const response = await apiClient.post<ExpectedReceipt>(
        `/inventory/expected-receipts/${payload.id}/receive`,
        {
          items: payload.items,
          ...(payload.comment ? { comment: payload.comment } : {}),
        },
      );

      return response.data;
    },
    onSuccess: () => {
      showSuccess("Приёмка проведена");
      void queryClient.invalidateQueries({ queryKey: ["expected-receipts"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-balances"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
