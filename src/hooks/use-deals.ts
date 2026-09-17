"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { apiClient } from "../lib/api-client";
import { getErrorMessage } from "../lib/errors";
import { showError, showSuccess } from "../lib/toast";
import { useI18n } from "@/i18n/provider";

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
  phone?: string | null;
  email?: string | null;
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
  productId?: string | null;
  quantitySheets: number;
  quantityM2: number | string;
  unitPrice: number | string;
  discount: number | string;
  totalPrice: number | string;
  purchasePriceSnapshot?: number | string | null;
  thickness?: number | string | null;
  panelTypeId?: string | null;
  supplierId?: string | null;
  panelSizeId?: string | null;
  product?: DealProduct;
  panelType?: {
    id?: string;
    code?: string;
    displayNameRu?: string | null;
    name?: string | null;
  } | null;
  supplier?: { id?: string; code?: string; name?: string } | null;
  panelSize?: {
    id?: string;
    widthMm?: number;
    heightMm?: number;
    displayName?: string | null;
    width?: number;
    length?: number;
    label?: string | null;
  } | null;
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

export type DealPermissions = {
  canEdit: boolean;
  canDelete: boolean;
  canChangeStage: boolean;
  canBypassStageValidation: boolean;
};

export type InstallationStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";

export type DealInstallation = {
  id: string;
  dealId: string;
  status: InstallationStatus | string;
  expectedInstallationAt?: string | null;
  expectedCompletionAt?: string | null;
  assessmentComment?: string | null;
  workComment?: string | null;
  assessedAt?: string | null;
  assessedById?: string | null;
  startedAt?: string | null;
  startedById?: string | null;
  installerConfirmedAt?: string | null;
  installerConfirmedById?: string | null;
  supervisorConfirmedAt?: string | null;
  supervisorConfirmedById?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  lostReasonCode?: string | null;
  lostComment?: string | null;
  lostAt?: string | null;
  lostById?: string | null;
  competitorName?: string | null;
  deletedAt?: string | null;
  completedAt?: string | null;
  fulfillmentSource?: string | null;
  installationRequiredSnapshot?: boolean | null;
  installation?: DealInstallation | null;
  createdAt: string;
  updatedAt: string;
  source?: string | null;
  supplierId?: string | null;
  calculationId?: string | null;
  origin?: string | null;
  deliveryAddress?: string | null;
  deliveryCost?: number | string | null;
  estimatedDeliveryDate?: string | null;
  delivery?: {
    address?: string | null;
    cost?: number | string | null;
    estimatedDate?: string | null;
  } | null;
  client?: DealClient | null;
  projectObject?: DealProjectObject | null;
  owner?: DealUser | null;
  supplier?: { id: string; name?: string; code?: string } | null;
  supplierOrder?: {
    id: string;
    status: string;
    trackingNumber?: string | null;
    estimatedDate?: string | null;
  } | null;
  supplierOrders?: Array<{
    id: string;
    status: string;
    supplierId?: string;
    orderedAt?: string | null;
    expectedReadyAt?: string | null;
    expectedShipmentAt?: string | null;
    expectedArrivalAt?: string | null;
    readyConfirmedAt?: string | null;
    deliveredAt?: string | null;
    trackingNumber?: string | null;
    estimatedDate?: string | null;
  }>;
  order?: {
    id: string;
    paymentStatus?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
    status?: string;
    deliveryAddress?: string | null;
    deletedAt?: string | null;
  } | null;
  items?: DealItem[];
  offers?: DealOffer[];
  stageHistory?: DealStageHistory[];
  _permissions?: DealPermissions;
};

export type DealsFilter = {
  stage?: DealStage;
  clientId?: string;
  ownerId?: string;
  projectObjectId?: string;
  search?: string;
  source?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
};

export type DealsListResponse = {
  items: Deal[];
  total: number;
  page: number;
  limit: number;
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

export type LoseDealPayload = {
  id: string;
  reason: string;
  comment?: string;
};

export function isHplCalculatorDeal(deal: Deal): boolean {
  if (deal.calculationId || deal.origin === "calculator") {
    return true;
  }

  return (deal.items ?? []).some(
    (item) =>
      Boolean(item.panelType) ||
      Boolean(item.panelTypeId) ||
      item.thickness !== undefined && item.thickness !== null,
  );
}

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
    retry: false,
  });
}

export function useChangeDealStage() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (payload: ChangeDealStagePayload): Promise<Deal> => {
      const { id, ...body } = payload;
      const response = await apiClient.post<Deal>(`/deals/${id}/stage`, body);

      return response.data;
    },
    onSuccess: (deal) => {
      showSuccess(t("deals.toastStageUpdated"));
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
      void queryClient.invalidateQueries({ queryKey: ["deals", deal.id] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      // 400 показывается в StageExceptionModal с текстом требований этапа —
      // дублирующий toast не нужен. Остальные ошибки — в toast.
      if (isAxiosError(error) && error.response?.status === 400) {
        return;
      }
      showError(getErrorMessage(error));
    },
  });
}

export function useAddDealOffer() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

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
      showSuccess(t("deals.toastDocumentVersion"));
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
      void queryClient.invalidateQueries({
        queryKey: ["deals", payload.dealId],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useLoseDeal() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (payload: LoseDealPayload): Promise<Deal> => {
      const response = await apiClient.post<Deal>(`/deals/${payload.id}/lose`, {
        reason: payload.reason,
        ...(payload.comment ? { comment: payload.comment } : {}),
      });
      return response.data;
    },
    onSuccess: (deal) => {
      showSuccess(t("deals.toastLost"));
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
      void queryClient.invalidateQueries({ queryKey: ["deals", deal.id] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
