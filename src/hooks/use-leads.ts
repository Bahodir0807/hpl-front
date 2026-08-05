'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export type LeadStatus =
  'NEW' | 'IN_PROGRESS' | 'QUALIFIED' | 'UNQUALIFIED' | 'CONVERTED';

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
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
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
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['lead', payload.id] });
      void queryClient.invalidateQueries({ queryKey: ['deals'] });
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
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['lead', payload.id] });
    },
  });
}
