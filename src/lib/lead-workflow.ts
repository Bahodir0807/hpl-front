import type { LeadStatus } from '@/hooks/use-leads';
import { getActiveMessages } from '@/i18n/active-messages';
import type { Messages } from '@/i18n/types';

export type LeadWorkflowState = {
  label: string;
  className: string;
  needsCommercialAction?: boolean;
};

type LeadWorkflowInput = {
  status: LeadStatus;
  commercialQualification?: unknown | null;
  managerCommercialInputReadyAt?: string | null;
};

export function resolveLeadWorkflowState(
  lead: LeadWorkflowInput,
  messages: Messages = getActiveMessages(),
): LeadWorkflowState {
  if (lead.status === 'NEW') {
    return {
      label: messages.statuses.leadWorkflow.NEW,
      className: 'border-blue-200 bg-blue-50 text-blue-700',
    };
  }

  if (lead.status === 'IN_PROGRESS') {
    return {
      label: messages.statuses.leadWorkflow.IN_PROGRESS,
      className: 'border-amber-200 bg-amber-50 text-amber-800',
    };
  }

  if (lead.status === 'QUALIFIED' && !lead.commercialQualification) {
    if (lead.managerCommercialInputReadyAt) {
      return {
        label: messages.statuses.leadWorkflow.handedToHead,
        className: 'border-orange-200 bg-orange-50 text-orange-800',
        needsCommercialAction: true,
      };
    }

    return {
      label: messages.statuses.leadWorkflow.waitingCommercial,
      className: 'border-orange-200 bg-orange-50 text-orange-800',
      needsCommercialAction: true,
    };
  }

  if (lead.status === 'QUALIFIED') {
    return {
      label: messages.statuses.leadWorkflow.commerciallyQualified,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  if (lead.status === 'CONVERTED') {
    return {
      label: messages.statuses.leadWorkflow.CONVERTED,
      className: 'border-green-200 bg-green-50 text-green-700',
    };
  }

  if (lead.status === 'LOST') {
    return {
      label: messages.statuses.leadWorkflow.LOST,
      className: 'border-red-200 bg-red-50 text-red-700',
    };
  }

  return {
    label: messages.statuses.leadWorkflow.UNQUALIFIED,
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  };
}
