'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import type {
  HplApplication,
  LeadCommercialQualification,
  LeadQualification,
  LeadQualificationItem,
} from '../types/hpl';

export type LeadStatus =
  'NEW' | 'IN_PROGRESS' | 'QUALIFIED' | 'UNQUALIFIED' | 'CONVERTED' | 'LOST';

export type LeadUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export type LeadClient = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  contacts?: Array<{
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    isPrimary?: boolean;
  }> | null;
};

export type LeadProjectObject = {
  id: string;
  name: string;
  address?: string | null;
  stage?: string | null;
  expectedDate?: string | null;
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
  lostReasonCode?: string | null;
  lostComment?: string | null;
  lostAt?: string | null;
  lostById?: string | null;
  managerCommercialNote?: string | null;
  managerCommercialNoteUpdatedAt?: string | null;
  managerCommercialInputReadyAt?: string | null;
  managerCommercialInputReadyById?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: LeadUser | null;
  client?: LeadClient | null;
  projectObject?: LeadProjectObject | null;
  contact?: LeadContact | null;
  deal?: LeadDeal | null;
  qualification?: LeadQualification | null;
  commercialQualification?: LeadCommercialQualification | null;
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
  contactId?: string;
  projectObjectId: string;
  objectStage?: string | null;
  objectExpectedDate?: string | null;
  needDescription: string;
  decisionMakerContact: string;
  qualification?: UpsertLeadQualificationPayload;
};

export type UpsertLeadQualificationPayload = {
  application?: HplApplication | null;
  panelTypeId?: string | null;
  thicknessMm?: number | string | null;
  panelSizeId?: string | null;
  customWidthMm?: number | null;
  customHeightMm?: number | null;
  colorCode?: string | null;
  colorName?: string | null;
  requiredAreaM2?: number | string | null;
  installationRequired?: boolean | null;
  ventFacadeExists?: boolean | null;
  ventFacadeKitRequired?: boolean | null;
  urgent?: boolean | null;
  willingToWait?: boolean | null;
  customerRequirements?: string | null;
  items?: Array<
    Partial<Omit<LeadQualificationItem, 'id'>> & { id?: string }
  >;
};

export type ConfirmLeadCommercialQualificationPayload = {
  id: string;
  supplierId: string;
  qualityClassId: string;
  targetDate?: string | null;
  decisionComment?: string | null;
};

export type UnqualifyLeadPayload = {
  id: string;
  reason: string;
};

export type LoseLeadPayload = {
  id: string;
  reason: string;
  comment?: string;
};

export type AssignLeadOwnerPayload = {
  id: string;
  ownerId: string;
};

export type UpdateLeadManagerCommercialNotePayload = {
  id: string;
  commercialNote: string;
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
    placeholderData: (previousData) => previousData,
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

export type DuplicateLookup = {
  phone?: string;
  inn?: string;
  email?: string;
  name?: string;
};

export function normalizeDuplicateLookup(
  input: DuplicateLookup,
): DuplicateLookup {
  return {
    phone: input.phone?.trim() || undefined,
    inn: input.inn?.trim() || undefined,
    email: input.email?.trim().toLowerCase() || undefined,
    name: input.name?.trim() || undefined,
  };
}

export function useCheckDuplicates(input: DuplicateLookup) {
  const normalizedInput = normalizeDuplicateLookup(input);

  return useQuery({
    queryKey: ['client-duplicates', normalizedInput],
    queryFn: async (): Promise<DuplicateMatch[]> => {
      const response = await apiClient.post<DuplicateMatch[]>(
        '/clients/check-duplicates',
        normalizedInput,
      );

      return response.data;
    },
    enabled: Boolean(
      normalizedInput.phone ||
        normalizedInput.inn ||
        normalizedInput.email ||
        normalizedInput.name,
    ),
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
      showSuccess('Лид квалифицирован');
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['lead', payload.id] });
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', payload.id],
      });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useUpsertLeadQualification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string } & UpsertLeadQualificationPayload) => {
      const { id, ...body } = payload;
      const response = await apiClient.patch(`/leads/${id}/qualification`, body);

      return response.data;
    },
    onSuccess: (_qualification, payload) => {
      showSuccess('Потребность HPL сохранена');
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', payload.id],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useConfirmLeadCommercialQualification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: ConfirmLeadCommercialQualificationPayload,
    ): Promise<unknown> => {
      const { id, ...body } = payload;
      const response = await apiClient.post(
        `/leads/${id}/commercial-qualification`,
        body,
      );

      return response.data;
    },
    onSuccess: (_qualification, payload) => {
      showSuccess('Коммерческая квалификация подтверждена');
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', payload.id],
      });
      void queryClient.invalidateQueries({ queryKey: ['lead', payload.id] });
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

export function useLoseLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: LoseLeadPayload): Promise<Lead> => {
      const response = await apiClient.post<Lead>(`/leads/${payload.id}/lose`, {
        reason: payload.reason,
        ...(payload.comment ? { comment: payload.comment } : {}),
      });
      return response.data;
    },
    onSuccess: (_lead, payload) => {
      showSuccess('Лид закрыт как проигранный');
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['lead', payload.id] });
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', payload.id],
      });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
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

export type ManagerCommercialNoteResponse = {
  leadId: string;
  commercialNote: string | null;
  managerCommercialNoteUpdatedAt: string | null;
  managerCommercialInputReadyAt: string | null;
  managerCommercialInputReadyById: string | null;
};

export function useUpdateLeadManagerCommercialNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: UpdateLeadManagerCommercialNotePayload,
    ): Promise<ManagerCommercialNoteResponse> => {
      const response = await apiClient.patch<ManagerCommercialNoteResponse>(
        `/leads/${payload.id}/manager-commercial-note`,
        { commercialNote: payload.commercialNote },
      );

      return response.data;
    },
    onSuccess: (_result, payload) => {
      showSuccess('Примечание сохранено');
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

export function useHandoffLeadToHead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      leadId: string,
    ): Promise<ManagerCommercialNoteResponse> => {
      const response = await apiClient.post<ManagerCommercialNoteResponse>(
        `/leads/${leadId}/handoff-to-head`,
      );

      return response.data;
    },
    onSuccess: (_result, leadId) => {
      showSuccess('Данные переданы руководителю');
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', leadId],
      });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
