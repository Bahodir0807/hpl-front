'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage, isHttpAccessDenied } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { useI18n } from '@/i18n/provider';
import type { LeadQualification } from '../types/hpl';
import type { Lead, LeadClient, LeadProjectObject, LeadStatus } from './use-leads';

export type EngineeringAssignmentStatus =
  | 'ACTIVE'
  | 'RETURNED'
  | 'COMPLETED'
  | 'SUPERSEDED';

export type EngineeringPerson = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export type EngineeringAssignment = {
  id: string;
  status: EngineeringAssignmentStatus;
  engineer: EngineeringPerson;
  assignedBy: EngineeringPerson;
  assignedAt: string;
  returnReason?: string | null;
  returnedAt?: string | null;
  returnedBy?: EngineeringPerson | null;
  completedAt?: string | null;
  completedBy?: EngineeringPerson | null;
  primaryQualificationCompletedAt?: string | null;
  primaryQualificationCompletedBy?: EngineeringPerson | null;
};

export type EngineeringQueueItem = {
  id: string;
  title: string;
  status: LeadStatus;
  ownerId: string;
  client?: Pick<LeadClient, 'id' | 'name'> | null;
  projectObject?: Pick<LeadProjectObject, 'id' | 'name' | 'address'> | null;
  installationRequired?: boolean | null;
  ventFacadeKitRequired?: boolean | null;
  engineering: EngineeringAssignment;
};

export type EngineeringQueueResponse = {
  items: EngineeringQueueItem[];
  total: number;
  page: number;
  limit: number;
};

export type EngineeringFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type EngineeringWorkspace = {
  lead: Lead;
  qualification: LeadQualification | null;
  engineering: EngineeringAssignment | null;
  activities: Array<{
    id: string;
    content?: string | null;
    createdAt: string;
    metadata?: { action?: string } | null;
    author?: EngineeringPerson | null;
  }>;
  files: EngineeringFile[];
};

export function useEngineers(enabled = true) {
  return useQuery({
    queryKey: ['engineering', 'engineers'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: EngineeringPerson[] }>(
        '/engineering/engineers',
      );
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEngineeringQueue(
  enabled = true,
  filters: { page?: number; limit?: number; status?: EngineeringAssignmentStatus } = {},
) {
  return useQuery({
    queryKey: ['engineering', 'leads', filters],
    queryFn: async () => {
      const response = await apiClient.get<EngineeringQueueResponse>(
        '/engineering/leads',
        { params: filters },
      );
      return response.data;
    },
    enabled,
  });
}

export function useEngineeringWorkspace(leadId: string, enabled = true) {
  return useQuery({
    queryKey: ['engineering', 'workspace', leadId],
    queryFn: async () => {
      const response = await apiClient.get<EngineeringWorkspace>(
        `/engineering/leads/${leadId}`,
      );
      return response.data;
    },
    enabled: enabled && Boolean(leadId),
    retry: (failureCount, error) =>
      !isHttpAccessDenied(error) && failureCount < 2,
  });
}

export function useAssignEngineer() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (payload: { leadId: string; engineerId: string }) => {
      const response = await apiClient.post(
        `/engineering/leads/${payload.leadId}/assign`,
        { engineerId: payload.engineerId },
      );
      return response.data;
    },
    onSuccess: async (_data, variables) => {
      showSuccess(t('leads.toastEngineerAssigned'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
        queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] }),
        queryClient.invalidateQueries({ queryKey: ['engineering'] }),
      ]);
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useReturnEngineeringLead() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (payload: { leadId: string; reason: string }) => {
      const response = await apiClient.post(
        `/engineering/leads/${payload.leadId}/return`,
        { reason: payload.reason },
      );
      return response.data;
    },
    onSuccess: async () => {
      showSuccess(t('engineering.toastReturned'));
      await queryClient.invalidateQueries({
        queryKey: ['engineering', 'leads'],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useCompleteEngineeringQualification() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const response = await apiClient.post(
        `/engineering/leads/${leadId}/complete`,
      );
      return response.data;
    },
    onSuccess: async (_data, leadId) => {
      showSuccess(t('engineering.toastCompleted'));
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['engineering', 'leads'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['engineering', 'workspace', leadId],
        }),
      ]);
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useFinishEngineeringWork() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const response = await apiClient.post(
        `/engineering/leads/${leadId}/finish`,
      );
      return response.data;
    },
    onSuccess: async () => {
      showSuccess(t('engineering.toastFinished'));
      await queryClient.invalidateQueries({
        queryKey: ['engineering', 'leads'],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
