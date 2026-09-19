'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SearchCombobox } from '@/components/ui/search-combobox';
import {
  EngineeringAssignment,
  useAssignEngineer,
  useEngineers,
} from '@/hooks/use-engineering';
import type { Lead } from '@/hooks/use-leads';
import { formatDateTime } from '@/lib/format';
import { formatPersonName } from '@/lib/display-names';
import { canAssignEngineerToLead } from '@/lib/engineering';
import { useI18n } from '@/i18n/provider';

type AssignEngineerPanelProps = {
  lead: Lead;
  permissions: readonly string[];
};

function latestAssignment(lead: Lead): EngineeringAssignment | null {
  const assignments = lead.engineeringAssignments ?? [];
  return assignments[0] ?? null;
}

export function AssignEngineerPanel({
  lead,
  permissions,
}: AssignEngineerPanelProps) {
  const { t, messages } = useI18n();
  const canAssign = canAssignEngineerToLead({
    permissions,
    status: lead.status,
    qualification: lead.qualification,
  });
  const assignment = latestAssignment(lead);
  const engineersQuery = useEngineers(canAssign);
  const assignEngineer = useAssignEngineer();
  const [isOpen, setIsOpen] = useState(false);
  const [engineerId, setEngineerId] = useState(assignment?.engineer.id ?? '');

  const engineerOptions = useMemo(
    () =>
      (engineersQuery.data?.items ?? []).map((engineer) => ({
        value: engineer.id,
        label: formatPersonName(engineer, engineer.email ?? undefined),
        description: engineer.email ?? undefined,
      })),
    [engineersQuery.data?.items],
  );

  if (!canAssign && !assignment) {
    return null;
  }

  const assignmentStatusLabel = assignment
    ? t(`statuses.engineeringAssignment.${assignment.status}`)
    : null;

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <h4 className="text-sm font-semibold text-slate-900">
        {t('leads.assignedEngineer')}
      </h4>
      {assignment ? (
        <div className="mt-2 space-y-1 text-sm text-slate-700">
          <p>{formatPersonName(assignment.engineer, assignment.engineer.email ?? undefined)}</p>
          <p className="text-xs text-slate-500">
            {assignmentStatusLabel}
            {assignment.assignedAt
              ? ` · ${t('leads.assignedAt')} ${formatDateTime(assignment.assignedAt)}`
              : ''}
          </p>
          {assignment.status === 'RETURNED' && assignment.returnReason ? (
            <p className="rounded border border-amber-200 bg-amber-50 p-2 text-amber-900">
              <span className="font-medium">
                {t('leads.returnReasonVisible')}:{' '}
              </span>
              {assignment.returnReason}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{messages.common.dash}</p>
      )}

      {canAssign ? (
        <div className="mt-3">
          {isOpen ? (
            <div className="max-w-sm space-y-3">
              <SearchCombobox
                value={engineerId}
                onChange={setEngineerId}
                options={engineerOptions}
                placeholder={t('leads.selectEngineer')}
                searchPlaceholder={t('common.search')}
                emptyLabel={t('leads.engineersEmpty')}
                loading={engineersQuery.isLoading}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!engineerId || assignEngineer.isPending}
                  onClick={() => {
                    void assignEngineer
                      .mutateAsync({ leadId: lead.id, engineerId })
                      .then(() => setIsOpen(false));
                  }}
                >
                  {t('common.save')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEngineerId(assignment?.engineer.id ?? '');
                setIsOpen(true);
              }}
            >
              {t('leads.assignToEngineer')}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
