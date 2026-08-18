import type { LeadStatus } from '@/hooks/use-leads';

export type LeadWorkflowState = {
  label: string;
  className: string;
  needsCommercialAction?: boolean;
};

type LeadWorkflowInput = {
  status: LeadStatus;
  commercialQualification?: unknown | null;
};

export function resolveLeadWorkflowState(
  lead: LeadWorkflowInput,
): LeadWorkflowState {
  if (lead.status === 'NEW') {
    return {
      label: 'Новая заявка',
      className: 'border-blue-200 bg-blue-50 text-blue-700',
    };
  }

  if (lead.status === 'IN_PROGRESS') {
    return {
      label: 'В работе',
      className: 'border-amber-200 bg-amber-50 text-amber-800',
    };
  }

  if (lead.status === 'QUALIFIED' && !lead.commercialQualification) {
    return {
      label: 'Ожидает коммерческой квалификации',
      className: 'border-orange-200 bg-orange-50 text-orange-800',
      needsCommercialAction: true,
    };
  }

  if (lead.status === 'QUALIFIED') {
    return {
      label: 'Коммерчески квалифицирован',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  if (lead.status === 'CONVERTED') {
    return {
      label: 'Конвертирован',
      className: 'border-green-200 bg-green-50 text-green-700',
    };
  }

  return {
    label: 'Не квалифицирован',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  };
}
