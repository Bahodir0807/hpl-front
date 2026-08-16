'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';

export type LeadStatus =
  'NEW' | 'IN_PROGRESS' | 'QUALIFIED' | 'UNQUALIFIED' | 'CONVERTED';

export type LeadUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export type LeadClient = {
  id: string;
  name: string;
};

export type LeadProjectObject = {
  id: string;
  name: string;
};

export type LeadContact = {
  id: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type LeadDeal = {
  id: string;
  title: string;
};

export type Lead = {
  id: string;
  title: string;
  source: string;
  status: LeadStatus;
  ownerId: string;
  clientId?: string | null;
  contactId?: string | null;
  projectObjectId?: string | null;
  dealId?: string | null;
  needDescription?: string | null;
  estimatedAmount?: number | string | null;
  targetDate?: string | null;
  decisionMakerContact?: string | null;
  unqualificationReason?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: LeadUser | null;
  client?: LeadClient | null;
  projectObject?: LeadProjectObject | null;
  contact?: LeadContact | null;
  deal?: LeadDeal | null;
};

export type LeadsFilter = {
  search?: string;
  status?: LeadStatus;
  source?: string;
  ownerId?: string;
  page?: number;
  limit?: number;
};

export type LeadsListResponse = {
  items: Lead[];
  total: number;
  page: number;
  limit: number;
};

export type DuplicateClient = {
  id: string;
  type: string;
  name: string;
  inn?: string | null;
  phone?: string | null;
  email?: string | null;
  ownerId: string;
  status: string;
};

export type DuplicateMatch = {
  client: DuplicateClient;
  reasons: string[];
};

export type CreateLeadPayload = {
  title: string;
  source: string;
  ownerId?: string;
  clientId?: string;
  contactId?: string;
};

export type QualifyLeadPayload = {
  id: string;
  clientId: string;
  projectObjectId: string;
  needDescription: string;
  estimatedAmount: number;
  targetDate: string;
  decisionMakerContact: string;
};

export type UnqualifyLeadPayload = {
  id: string;
  reason: string;
};

export type AssignLeadOwnerPayload = {
  id: string;
  ownerId: string;
};

export function useLeads(filters: LeadsFilter) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async (): Promise<LeadsListResponse> => {
      const response = await apiClient.get<LeadsListResponse>('/leads', {
        params: filters,
      });

      return response.data;
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async (): Promise<Lead> => {
      const response = await apiClient.get<Lead>(`/leads/${id}`);

      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useCheckDuplicates(query: string) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: ['client-duplicates', normalizedQuery],
    queryFn: async (): Promise<DuplicateMatch[]> => {
      const response = await apiClient.post<DuplicateMatch[]>(
        '/clients/check-duplicates',
        {
          phone: normalizedQuery,
          email: normalizedQuery.includes('@') ? normalizedQuery : undefined,
          inn: normalizedQuery,
          name: normalizedQuery,
        },
      );

      return response.data;
    },
    enabled: normalizedQuery.length >= 3,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateLeadPayload): Promise<Lead> => {
      const response = await apiClient.post<Lead>('/leads', payload);

      return response.data;
    },
    onSuccess: () => {
      showSuccess('Лид создан');
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useQualifyLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: QualifyLeadPayload): Promise<Lead> => {
      const { id, ...body } = payload;
      const response = await apiClient.post<Lead>(`/leads/${id}/qualify`, body);

      return response.data;
    },
    onSuccess: (_lead, payload) => {
      showSuccess('Лид квалифицирован, сделка создана');
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['lead', payload.id] });
      void queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useUnqualifyLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UnqualifyLeadPayload): Promise<Lead> => {
      const response = await apiClient.post<Lead>(
        `/leads/${payload.id}/disqualify`,
        {
          reason: payload.reason,
        },
      );

      return response.data;
    },
    onSuccess: (_lead, payload) => {
      showSuccess('Лид переведён в неквалифицированные');
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['lead', payload.id] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useAssignLeadOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AssignLeadOwnerPayload): Promise<Lead> => {
      const response = await apiClient.post<Lead>(
        `/leads/${payload.id}/assign`,
        { newOwnerId: payload.ownerId },
      );

      return response.data;
    },
    onSuccess: (_lead, payload) => {
      showSuccess('Менеджер назначен');
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['lead', payload.id] });
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', payload.id],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
