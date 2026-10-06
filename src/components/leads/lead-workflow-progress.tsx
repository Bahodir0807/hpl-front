'use client';

import { Check } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { LeadStatus } from '@/hooks/use-leads';

export type LeadWorkflowStage =
  | 'intake'
  | 'qualification'
  | 'managerNote'
  | 'calculation'
  | 'quote'
  | 'deal';

const STAGES: LeadWorkflowStage[] = [
  'intake',
  'qualification',
  'managerNote',
  'calculation',
  'quote',
  'deal',
];

export function resolveLeadWorkflowStage(input: {
  status: LeadStatus;
  hasQualification: boolean;
  hasManagerNote: boolean;
  hasCalculationRequest: boolean;
  hasQuote: boolean;
  hasDeal: boolean;
}): LeadWorkflowStage {
  if (input.status === 'LOST' || input.status === 'UNQUALIFIED') {
    return 'intake';
  }
  if (input.hasDeal || input.status === 'CONVERTED') {
    return 'deal';
  }
  if (input.hasQuote) {
    return 'quote';
  }
  if (input.hasCalculationRequest) {
    return 'calculation';
  }
  if (input.hasManagerNote) {
    return 'managerNote';
  }
  if (input.hasQualification || input.status === 'QUALIFIED') {
    return 'qualification';
  }
  return 'intake';
}

export function LeadWorkflowProgress({
  stage,
}: {
  stage: LeadWorkflowStage;
}) {
  const { t } = useI18n();
  const currentIndex = STAGES.indexOf(stage);

  return (
    <nav aria-label={t('statuses.leadStage.qualification')} className="w-full">
      <ol className="flex flex-wrap items-center gap-y-2 text-xs">
        {STAGES.map((item, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          return (
            <li key={item} className="flex items-center">
              {index > 0 ? (
                <span
                  aria-hidden
                  className={`mx-2 h-px w-4 sm:w-6 ${
                    index <= currentIndex ? 'bg-primary' : 'bg-border'
                  }`}
                />
              ) : null}
              <span
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 font-medium ${
                  current
                    ? 'bg-primary text-primary-foreground'
                    : done
                      ? 'bg-muted text-foreground'
                      : 'bg-muted/60 text-muted-foreground'
                }`}
              >
                {done ? <Check className="h-3 w-3" aria-hidden /> : null}
                {t(`statuses.leadStage.${item}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
