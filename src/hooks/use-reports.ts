"use client";

import { useQuery } from "@tanstack/react-query";
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
  amount: number;
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
  salesPlanPercent: number;
  qualifiedLeadsPercent: number;
  conversionPercent: number;
  deadlineCompliancePercent: number;
  crmDisciplinePercent: number;
  totalScore: number;
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

export function useReportsFunnel(filters: ReportsFilter) {
  return useQuery({
    queryKey: ["reports", "funnel", filters],
    queryFn: async (): Promise<FunnelReport> => {
      const response = await apiClient.get<FunnelReport>("/reports/funnel", {
        params: filters,
      });

      return response.data;
    },
    retry: false,
  });
}

export function useReportsOverdues(filters: ReportsFilter) {
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
    retry: false,
  });
}

export function useReportsKpi(filters: ReportsFilter) {
  return useQuery({
    queryKey: ["reports", "kpi", filters],
    queryFn: async (): Promise<KpiReport> => {
      const response = await apiClient.get<KpiReport>("/reports/kpi", {
        params: filters,
      });

      return response.data;
    },
    retry: false,
  });
}
