'use client';

import { useQuery } from '@tanstack/react-query';
import type { DealsFilter, DealsListResponse } from '@/hooks/use-deals';
import type { LeadsFilter, LeadsListResponse } from '@/hooks/use-leads';
import type { TasksFilter, TasksListResponse } from '@/hooks/use-tasks';
import { apiClient } from '@/lib/api-client';
import type { Quote, QuoteStatus } from '@/types/hpl';

type DashboardQueryOptions = {
  userId?: string;
  section: string;
  enabled: boolean;
};

export function useDashboardLeads(
  options: DashboardQueryOptions,
  filters: LeadsFilter,
) {
  return useQuery({
    queryKey: ['dashboard', options.userId, 'leads', options.section, filters],
    queryFn: async (): Promise<LeadsListResponse> => {
      const response = await apiClient.get<LeadsListResponse>('/leads', {
        params: filters,
      });
      return response.data;
    },
    enabled: options.enabled && Boolean(options.userId),
    placeholderData: (previousData) => previousData,
  });
}

export type DashboardTasksFilter = TasksFilter & {
  dateFrom?: string;
  dateTo?: string;
};

export function useDashboardTasks(
  options: DashboardQueryOptions,
  filters: DashboardTasksFilter,
) {
  return useQuery({
    queryKey: ['dashboard', options.userId, 'tasks', options.section, filters],
    queryFn: async (): Promise<TasksListResponse> => {
      const response = await apiClient.get<TasksListResponse>('/tasks', {
        params: filters,
      });
      return response.data;
    },
    enabled: options.enabled && Boolean(options.userId),
    placeholderData: (previousData) => previousData,
  });
}

export function useDashboardDeals(
  options: DashboardQueryOptions,
  filters: DealsFilter,
) {
  return useQuery({
    queryKey: ['dashboard', options.userId, 'deals', options.section, filters],
    queryFn: async (): Promise<DealsListResponse> => {
      const response = await apiClient.get<DealsListResponse>('/deals', {
        params: filters,
      });
      return response.data;
    },
    enabled: options.enabled && Boolean(options.userId),
    placeholderData: (previousData) => previousData,
  });
}

export type DashboardQuotesFilter = {
  status?: QuoteStatus;
  page?: number;
  limit?: number;
};

export type DashboardQuotesResponse = {
  items: Quote[];
  total: number;
  page: number;
  limit: number;
};

export function useDashboardQuotes(
  options: DashboardQueryOptions,
  filters: DashboardQuotesFilter,
) {
  return useQuery({
    queryKey: ['dashboard', options.userId, 'quotes', options.section, filters],
    queryFn: async (): Promise<DashboardQuotesResponse> => {
      const response = await apiClient.get<DashboardQuotesResponse>('/quotes', {
        params: filters,
      });
      return response.data;
    },
    enabled: options.enabled && Boolean(options.userId),
    placeholderData: (previousData) => previousData,
  });
}
