"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

export type DealStage =
  | "QUALIFICATION"
  | "HPL_SELECTION"
  | "OFFER_PREPARATION"
  | "NEGOTIATION"
  | "AGREEMENT_PENDING"
  | "PAYMENT_PREPARATION"
  | "SHIPPED"
  | "WON"
  | "LOST";

export const dealStages: DealStage[] = [
  "QUALIFICATION",
  "HPL_SELECTION",
  "OFFER_PREPARATION",
  "NEGOTIATION",
  "AGREEMENT_PENDING",
  "PAYMENT_PREPARATION",
  "SHIPPED",
  "WON",
  "LOST",
];

export type DealUser = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

export type DealClient = {
  id: string;
  name: string;
};

export type DealProjectObject = {
  id: string;
  name: string;
};

export type DealProduct = {
  id: string;
  sku: string;
  name: string;
  sheetArea?: number | string | null;
};

export type DealItem = {
  id: string;
  productId: string;
  quantitySheets: number;
  quantityM2: number | string;
  unitPrice: number | string;
  discount: number | string;
  totalPrice: number | string;
  purchasePriceSnapshot?: number | string | null;
  product?: DealProduct;
};

export type DealOffer = {
  id: string;
  version: number;
  number: string;
  amount: number | string;
  validUntil?: string | null;
  isApproved: boolean;
  pdfFileId?: string | null;
  createdAt: string;
};

export type DealStageHistory = {
  id: string;
  oldStage: DealStage;
  newStage: DealStage;
  reason?: string | null;
  isException: boolean;
  approvedById?: string | null;
  changedBy?: DealUser | null;
  approvedBy?: DealUser | null;
  createdAt: string;
};

export type Deal = {
  id: string;
  title: string;
  stage: DealStage;
  clientId: string;
  projectObjectId?: string | null;
  ownerId: string;
  totalAmount: number | string;
  margin?: number | string | null;
  nextActionAt?: string | null;
  expectedCloseDate?: string | null;
  lossReason?: string | null;
  competitorName?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: DealClient | null;
  projectObject?: DealProjectObject | null;
  owner?: DealUser | null;
  items?: DealItem[];
  offers?: DealOffer[];
  stageHistory?: DealStageHistory[];
};

export type DealsFilter = {
  stage?: DealStage;
  clientId?: string;
  ownerId?: string;
  projectObjectId?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type DealsListResponse = {
  items: Deal[];
  total: number;
  page: number;
  limit: number;
};

export type CreateDealItemPayload = {
  productId: string;
  quantitySheets: number;
  quantityM2: number;
  unitPrice: number;
  discount?: number;
};

export type CreateDealPayload = {
  title: string;
  clientId: string;
  projectObjectId?: string;
  ownerId?: string;
  expectedCloseDate?: string;
  items?: CreateDealItemPayload[];
};

export type ChangeDealStagePayload = {
  id: string;
  newStage: DealStage;
  reason?: string;
  lossReason?: string;
  competitorName?: string;
  isException?: boolean;
};

export type AddDealOfferPayload = {
  dealId: string;
  validUntil?: string;
  pdfFileId?: string;
};

export function useDeals(filters: DealsFilter) {
  return useQuery({
    queryKey: ["deals", filters],
    queryFn: async (): Promise<DealsListResponse> => {
      const response = await apiClient.get<DealsListResponse>("/deals", {
        params: filters,
      });

      return response.data;
    },
  });
}

export function useDeal(id: string | null) {
  return useQuery({
    queryKey: ["deals", id],
    queryFn: async (): Promise<Deal> => {
      const response = await apiClient.get<Deal>(`/deals/${id}`);

      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDealPayload): Promise<Deal> => {
      const response = await apiClient.post<Deal>("/deals", payload);

      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useChangeDealStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ChangeDealStagePayload): Promise<Deal> => {
      const { id, ...body } = payload;
      const response = await apiClient.post<Deal>(`/deals/${id}/stage`, body);

      return response.data;
    },
    onSuccess: (deal) => {
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
      void queryClient.invalidateQueries({ queryKey: ["deals", deal.id] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useAddDealOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddDealOfferPayload): Promise<DealOffer> => {
      const response = await apiClient.post<DealOffer>(
        `/deals/${payload.dealId}/offers`,
        {
          validUntil: payload.validUntil,
          pdfFileId: payload.pdfFileId,
        },
      );

      return response.data;
    },
    onSuccess: (_offer, payload) => {
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
      void queryClient.invalidateQueries({
        queryKey: ["deals", payload.dealId],
      });
    },
  });
}
