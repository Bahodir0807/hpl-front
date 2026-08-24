"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { DealStage } from "./use-deals";

export type ReportsFilter = {
  dateFrom?: string;
  dateTo?: string;
  managerId?: string;
};

export type FunnelStageMetric = {
  stage: DealStage;
  count: number;
  amount: number | null;
  currency: string | null;
  amounts: Array<{ amount: number; currency: string }>;
  conversionPercent: number;
};

export type FunnelReport = {
  stages: FunnelStageMetric[];
  totalDeals: number;
  wonDeals: number;
  winConversionPercent: number;
};

export type OverdueManagerMetric = {
  managerId: string;
  managerName: string;
  overdueCount: number;
  criticalOverdueCount: number;
  averageDelayHours: number;
};

export type OverduesReport = {
  managers: OverdueManagerMetric[];
  totalOverdue: number;
  totalCritical: number;
};

export type KpiManagerMetric = {
  managerId: string;
  managerName: string;
  salesPlanPercent: number | null;
  salesPlanCurrency: string | null;
  actualSalesInPlanCurrency: number | null;
  salesPlanStatus: "COMPLETE" | "INCOMPLETE" | "NOT_CONFIGURED";
  missingFxCurrencies: string[];
  qualifiedLeadsPercent: number;
  conversionPercent: number;
  deadlineCompliancePercent: number;
  crmDisciplinePercent: number;
  totalScore: number | null;
};

export type UpsertSalesPlanPayload = {
  userId: string;
  period: string;
  targetAmount: string;
  currencyCode: string;
  fxRates: Array<{ fromCurrency: string; rateToPlanCurrency: string }>;
};

export type KpiReport = {
  weights: {
    salesPlan: 40;
    qualifiedLeads: 15;
    conversion: 15;
    deadlineCompliance: 15;
    crmDiscipline: 15;
  };
  managers: KpiManagerMetric[];
};

export type ReportsOverview = {
  period?: { from?: string; to?: string };
  leads?: {
    total?: number;
    qualified?: number;
    converted?: number;
    lost?: number;
    byStatus?: Record<string, number>;
    lossReasons?: Record<string, number>;
  };
  quotes?: {
    created?: number;
    approved?: number;
    clientAccepted?: number;
  };
  deals?: {
    active?: number;
    won?: number;
    lost?: number;
    operationallyCompleted?: number;
    byStage?: Record<string, number>;
    lossReasons?: Record<string, number>;
  };
  supplierOrders?: {
    active?: number;
    overdueReadiness?: number;
    byStatus?: Record<string, number>;
  };
  installation?: {
    scheduled?: number;
    pendingDualConfirmation?: number;
    completed?: number;
    byStatus?: Record<string, number>;
  };
  warehouse?: {
    stockRows?: number;
    onHand?: number;
    reserved?: number;
    available?: number;
    pendingPurchases?: number;
    partiallyReceivedPurchases?: number;
  };
  averageDurationsHours?: {
    quoteCreatedToClientAccepted?: number | null;
    supplierOrderedToReady?: number | null;
    dealWonToOperationalCompletion?: number | null;
  };
};

export function useReportsOverview(filters: ReportsFilter, enabled = true) {
  return useQuery({
    queryKey: ["reports", "overview", filters],
    queryFn: async (): Promise<ReportsOverview> => {
      const response = await apiClient.get<ReportsOverview>(
        "/reports/overview",
        { params: filters },
      );
      return response.data;
    },
    enabled,
    retry: false,
  });
}

export function useReportsFunnel(filters: ReportsFilter, enabled = true) {
  return useQuery({
    queryKey: ["reports", "funnel", filters],
    queryFn: async (): Promise<FunnelReport> => {
      const response = await apiClient.get<FunnelReport>("/reports/funnel", {
        params: filters,
      });

      return response.data;
    },
    enabled,
    retry: false,
  });
}

export function useReportsOverdues(filters: ReportsFilter, enabled = true) {
  return useQuery({
    queryKey: ["reports", "overdues", filters],
    queryFn: async (): Promise<OverduesReport> => {
      const response = await apiClient.get<OverduesReport>(
        "/reports/overdues",
        {
          params: filters,
        },
      );

      return response.data;
    },
    enabled,
    retry: false,
  });
}

export function useReportsKpi(filters: ReportsFilter, enabled = true) {
  return useQuery({
    queryKey: ["reports", "kpi", filters],
    queryFn: async (): Promise<KpiReport> => {
      const response = await apiClient.get<KpiReport>("/reports/kpi", {
        params: filters,
      });

      return response.data;
    },
    enabled,
    retry: false,
  });
}

export function useUpsertSalesPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpsertSalesPlanPayload) => {
      const response = await apiClient.post("/reports/sales-plans", payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reports", "kpi"] });
    },
  });
}
