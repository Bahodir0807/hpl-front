'use client';

import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import {
  getInstallationErrorMessage,
  isInstallationConflictError,
  isInstallationForbiddenError,
  isInstallationNotFoundError,
} from '../lib/installation-errors';
import { showError, showSuccess } from '../lib/toast';
import type { DealInstallation, InstallationStatus } from './use-deals';

export const installationsQueryKey = ['installations'] as const;

export function installationByDealQueryKey(dealId: string) {
  return [...installationsQueryKey, 'deal', dealId] as const;
}

export function installationByIdQueryKey(installationId: string) {
  return [...installationsQueryKey, 'job', installationId] as const;
}

export function installationJobsQueryKey(filters?: InstallationJobsFilter) {
  return [...installationsQueryKey, 'jobs', filters] as const;
}

export type ScheduleInstallationPayload = {
  dealId: string;
  expectedInstallationAt: string;
  expectedCompletionAt: string;
};

export type UpdateInstallationAssessmentPayload = {
  dealId: string;
  assessmentComment?: string;
  workComment?: string;
};

export type InstallationDealActionPayload = {
  dealId: string;
};

export type InstallationActorSummary = {
  id: string;
  firstName: string;
  lastName: string;
};

export type InstallationJobClient = {
  id: string;
  name: string;
  phone?: string | null;
};

export type InstallationJobProjectObject = {
  id: string;
  name: string;
  address?: string | null;
};

export type InstallationJobDeal = {
  id: string;
  title: string;
  stage?: string;
  completedAt?: string | null;
  installationRequiredSnapshot?: boolean | null;
  client: InstallationJobClient;
  projectObject?: InstallationJobProjectObject | null;
};

export type InstallationJobDelivery = {
  fulfillmentSource?: string | null;
  materialsDelivered: boolean;
  orderStatus?: string | null;
  supplierOrderStatuses?: string[];
};

export type InstallationJob = {
  id: string;
  dealId: string;
  status: InstallationStatus | string;
  expectedInstallationAt?: string | null;
  expectedCompletionAt?: string | null;
  assessmentComment?: string | null;
  workComment?: string | null;
  assessedAt?: string | null;
  assessedBy?: InstallationActorSummary | null;
  startedAt?: string | null;
  startedBy?: InstallationActorSummary | null;
  installerConfirmedAt?: string | null;
  installerConfirmedBy?: InstallationActorSummary | null;
  supervisorConfirmedAt?: string | null;
  supervisorConfirmedBy?: InstallationActorSummary | null;
  completedAt?: string | null;
  installationRequiredSnapshot?: boolean | null;
  dealCompletedAt?: string | null;
  deal: InstallationJobDeal;
  delivery: InstallationJobDelivery;
};

export type InstallationJobsFilter = {
  page?: number;
  limit?: number;
  status?: InstallationStatus;
  requiringAction?: boolean;
};

export type InstallationJobsListResponse = {
  items: InstallationJob[];
  total: number;
  page: number;
  limit: number;
};

function isForbiddenOrUnauthorized(error: unknown): boolean {
  return (
    isAxiosError(error) &&
    (error.response?.status === 403 || error.response?.status === 401)
  );
}

function compactQueryParams(
  filters: InstallationJobsFilter,
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};

  if (filters.page != null) {
    params.page = filters.page;
  }
  if (filters.limit != null) {
    params.limit = filters.limit;
  }
  if (filters.status) {
    params.status = filters.status;
  }
  if (filters.requiringAction != null) {
    params.requiringAction = filters.requiringAction;
  }

  return params;
}

async function fetchInstallationByDealId(
  dealId: string,
): Promise<DealInstallation | null> {
  try {
    const response = await apiClient.get<DealInstallation>(
      `/deals/${dealId}/installation`,
    );
    return response.data;
  } catch (error) {
    if (
      isInstallationNotFoundError(error) ||
      isInstallationForbiddenError(error)
    ) {
      return null;
    }
    throw error;
  }
}

export function toDealInstallation(job: InstallationJob): DealInstallation {
  return {
    id: job.id,
    dealId: job.dealId,
    status: job.status,
    expectedInstallationAt: job.expectedInstallationAt,
    expectedCompletionAt: job.expectedCompletionAt,
    assessmentComment: job.assessmentComment,
    workComment: job.workComment,
    assessedAt: job.assessedAt,
    assessedById: job.assessedBy?.id ?? null,
    startedAt: job.startedAt,
    startedById: job.startedBy?.id ?? null,
    installerConfirmedAt: job.installerConfirmedAt,
    installerConfirmedById: job.installerConfirmedBy?.id ?? null,
    supervisorConfirmedAt: job.supervisorConfirmedAt,
    supervisorConfirmedById: job.supervisorConfirmedBy?.id ?? null,
    completedAt: job.completedAt,
  };
}

export function invalidateInstallationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  dealId?: string,
  installationId?: string,
): void {
  void queryClient.invalidateQueries({ queryKey: installationsQueryKey });
  void queryClient.invalidateQueries({ queryKey: ['deals'] });
  void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  void queryClient.invalidateQueries({ queryKey: ['tasks'] });
  void queryClient.invalidateQueries({ queryKey: ['orders'] });

  if (dealId) {
    void queryClient.invalidateQueries({
      queryKey: installationByDealQueryKey(dealId),
    });
    void queryClient.invalidateQueries({ queryKey: ['deals', dealId] });
  }

  if (installationId) {
    void queryClient.invalidateQueries({
      queryKey: installationByIdQueryKey(installationId),
    });
  }
}

export function useInstallationJobs(
  filters: InstallationJobsFilter = {},
  enabled = true,
) {
  return useQuery({
    queryKey: installationJobsQueryKey(filters),
    queryFn: async (): Promise<InstallationJobsListResponse> => {
      const response = await apiClient.get<InstallationJobsListResponse>(
        '/installations',
        { params: compactQueryParams(filters) },
      );

      return response.data;
    },
    enabled,
    retry: (failureCount, error) => {
      if (isForbiddenOrUnauthorized(error)) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useInstallationJob(installationId: string | null) {
  return useQuery({
    queryKey: installationByIdQueryKey(installationId ?? ''),
    queryFn: async (): Promise<InstallationJob> => {
      const response = await apiClient.get<InstallationJob>(
        `/installations/${installationId}`,
      );
      return response.data;
    },
    enabled: Boolean(installationId),
    retry: false,
  });
}

export function useDealInstallation(dealId: string | null) {
  return useQuery({
    queryKey: installationByDealQueryKey(dealId ?? ''),
    queryFn: async (): Promise<DealInstallation | null> => {
      return fetchInstallationByDealId(dealId ?? '');
    },
    enabled: Boolean(dealId),
    retry: false,
  });
}

function useInstallationMutation<TPayload extends { dealId: string }>(
  action: (payload: TPayload) => Promise<DealInstallation>,
  successMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: action,
    onSuccess: (installation, payload) => {
      showSuccess(successMessage);
      invalidateInstallationQueries(
        queryClient,
        payload.dealId,
        installation.id,
      );
    },
    onError: (error, payload) => {
      showError(getInstallationErrorMessage(error));
      if (isInstallationConflictError(error)) {
        invalidateInstallationQueries(queryClient, payload.dealId);
      }
    },
  });
}

export function useScheduleInstallation() {
  return useInstallationMutation(
    async (payload: ScheduleInstallationPayload) => {
      const response = await apiClient.post<DealInstallation>(
        `/deals/${payload.dealId}/installation/schedule`,
        {
          expectedInstallationAt: payload.expectedInstallationAt,
          expectedCompletionAt: payload.expectedCompletionAt,
        },
      );
      return response.data;
    },
    'Даты монтажа сохранены',
  );
}

export function useUpdateInstallationAssessment() {
  return useInstallationMutation(
    async (payload: UpdateInstallationAssessmentPayload) => {
      const response = await apiClient.patch<DealInstallation>(
        `/deals/${payload.dealId}/installation/assessment`,
        {
          ...(payload.assessmentComment !== undefined
            ? { assessmentComment: payload.assessmentComment }
            : {}),
          ...(payload.workComment !== undefined
            ? { workComment: payload.workComment }
            : {}),
        },
      );
      return response.data;
    },
    'Оценка монтажа сохранена',
  );
}

export function useStartInstallation() {
  return useInstallationMutation(
    async (payload: InstallationDealActionPayload) => {
      const response = await apiClient.post<DealInstallation>(
        `/deals/${payload.dealId}/installation/start`,
      );
      return response.data;
    },
    'Монтаж начат',
  );
}

export function useConfirmInstallerInstallation() {
  return useInstallationMutation(
    async (payload: InstallationDealActionPayload) => {
      const response = await apiClient.post<DealInstallation>(
        `/deals/${payload.dealId}/installation/confirm-installer`,
      );
      return response.data;
    },
    'Монтажник подтвердил выполнение работ',
  );
}

export function useConfirmSupervisorInstallation() {
  return useInstallationMutation(
    async (payload: InstallationDealActionPayload) => {
      const response = await apiClient.post<DealInstallation>(
        `/deals/${payload.dealId}/installation/confirm-supervisor`,
      );
      return response.data;
    },
    'Руководитель подтвердил завершение монтажа',
  );
}
