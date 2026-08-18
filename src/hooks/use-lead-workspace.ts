'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError, showSuccess } from '../lib/toast';
import { LeadActivity, LeadCall, LeadNote, LeadWorkspace } from '../types/hpl';

export type {
  LeadActivity,
  LeadCall,
  LeadNote,
  LeadWorkspace,
} from '../types/hpl';

export type NormalizedLeadWorkspace = {
  lead: LeadWorkspace['lead'];
  calculations: NonNullable<LeadWorkspace['calculations']>;
  quotes: NonNullable<LeadWorkspace['quotes']>;
  qualification: LeadWorkspace['qualification'];
  requirementPrefill: LeadWorkspace['requirementPrefill'];
  commercialQualification: LeadWorkspace['commercialQualification'];
  commercialPrefill: LeadWorkspace['commercialPrefill'];
  calls: LeadCall[];
  notes: LeadNote[];
  activities: LeadActivity[];
};

export function normalizeLeadWorkspace(
  data: LeadWorkspace,
): NormalizedLeadWorkspace {
  return {
    lead: data.lead,
    calculations: data.calculations ?? [],
    quotes: data.quotes ?? [],
    qualification: data.qualification ?? null,
    requirementPrefill: data.requirementPrefill ?? null,
    commercialQualification: data.commercialQualification ?? null,
    commercialPrefill: data.commercialPrefill ?? null,
    calls: data.calls ?? [],
    notes: data.notes ?? [],
    activities: data.activities ?? data.timeline ?? [],
  };
}

export type CreateLeadCallPayload = {
  leadId: string;
  comment?: string;
};

export type CreateLeadNotePayload = {
  leadId: string;
  text: string;
};

export function useLeadWorkspace(leadId: string) {
  return useQuery({
    queryKey: ['lead-workspace', leadId],
    queryFn: async (): Promise<NormalizedLeadWorkspace> => {
      const response = await apiClient.get<LeadWorkspace>(
        `/leads/${leadId}/workspace`,
      );

      return normalizeLeadWorkspace(response.data);
    },
    enabled: Boolean(leadId),
  });
}

export function useCreateLeadCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateLeadCallPayload): Promise<LeadCall> => {
      const { leadId, ...body } = payload;
      const response = await apiClient.post<LeadCall>(
        `/leads/${leadId}/calls`,
        body,
      );

      return response.data;
    },
    onSuccess: (_call, payload) => {
      showSuccess('Звонок зарегистрирован');
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', payload.leadId],
      });
      void queryClient.invalidateQueries({ queryKey: ['lead', payload.leadId] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useCreateLeadNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateLeadNotePayload): Promise<LeadNote> => {
      const response = await apiClient.post<LeadNote>(
        `/leads/${payload.leadId}/notes`,
        { note: payload.text },
      );

      return response.data;
    },
    onSuccess: (_note, payload) => {
      showSuccess('Заметка добавлена');
      void queryClient.invalidateQueries({
        queryKey: ['lead-workspace', payload.leadId],
      });
      void queryClient.invalidateQueries({ queryKey: ['lead', payload.leadId] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
