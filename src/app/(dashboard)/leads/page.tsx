'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CreateLeadModal } from '../../../components/leads/create-lead-modal';
import { UnqualifyLeadModal } from '../../../components/leads/unqualify-lead-modal';
import { Lead, LeadStatus, useLeads } from '../../../hooks/use-leads';
import { useUsersList } from '../../../hooks/use-users';
import { formatDateTime } from '../../../lib/format';
import { formatMoney } from '../../../lib/currency';
import {
  resolveEntityName,
  resolveUserName,
} from '../../../lib/display-names';
import { leadStatusLabels } from '../../../lib/labels';

const QualifyLeadModal = dynamic(
  () =>
    import('@/components/leads/qualify-lead-modal').then(
      (m) => m.QualifyLeadModal,
    ),
  { ssr: false },
);

type StatusFilter = 'ALL' | LeadStatus;

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Все статусы' },
  { value: 'NEW', label: leadStatusLabels.NEW },
  { value: 'IN_PROGRESS', label: leadStatusLabels.IN_PROGRESS },
  { value: 'QUALIFIED', label: leadStatusLabels.QUALIFIED },
  { value: 'UNQUALIFIED', label: leadStatusLabels.UNQUALIFIED },
  { value: 'CONVERTED', label: leadStatusLabels.CONVERTED },
];

const statusClassName: Record<LeadStatus, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  QUALIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UNQUALIFIED: 'bg-slate-100 text-slate-700 border-slate-200',
  CONVERTED: 'bg-green-50 text-green-700 border-green-200',
};

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold ${statusClassName[status]}`}
    >
      {leadStatusLabels[status] ?? status}
    </span>
  );
}

export default function LeadsPage() {
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [unqualifyingLead, setUnqualifyingLead] = useState<Lead | null>(null);
  const filters = useMemo(
    () => ({
      status: status === 'ALL' ? undefined : status,
    }),
    [status],
  );
  const leadsQuery = useLeads(filters);
  const { usersById } = useUsersList();
  const leads = leadsQuery.data?.items ?? [];

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Лиды</h2>
            <p className="mt-1 text-sm text-slate-600">
              Первичные обращения, квалификация и конвертация в сделки.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            Создать лид
          </button>
        </div>

        <div className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-medium">Статус</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as StatusFilter)
              }
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {leadsQuery.isLoading ? (
          <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Загрузка лидов...
          </div>
        ) : null}

        {leadsQuery.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Не удалось загрузить лиды.
          </div>
        ) : null}

        {!leadsQuery.isLoading && !leadsQuery.isError && leads.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white p-8 text-center">
            <div className="text-sm font-medium text-slate-900">
              Лиды не найдены
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Измените фильтр или создайте новый лид.
            </div>
          </div>
        ) : null}

        {!leadsQuery.isLoading && !leadsQuery.isError && leads.length > 0 ? (
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Название / Источник
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Статус
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Ответственный
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Объект / Оценка
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Создан
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-950">
                        {lead.title}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {lead.source}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {resolveUserName(lead.owner, lead.ownerId, usersById)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-slate-700">
                        {resolveEntityName(
                          lead.projectObject,
                          lead.projectObjectId,
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {formatMoney(lead.estimatedAmount)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatDateTime(lead.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setQualifyingLead(lead)}
                          disabled={lead.status === 'CONVERTED'}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                        >
                          Квалифицировать
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnqualifyingLead(lead)}
                          disabled={lead.status === 'UNQUALIFIED'}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                        >
                          Брак
                        </button>
                        <Link
                          href={`/leads/${lead.id}`}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Просмотр
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <QualifyLeadModal
        lead={qualifyingLead}
        isOpen={Boolean(qualifyingLead)}
        onClose={() => setQualifyingLead(null)}
      />
      <UnqualifyLeadModal
        lead={unqualifyingLead}
        isOpen={Boolean(unqualifyingLead)}
        onClose={() => setUnqualifyingLead(null)}
      />
    </>
  );
}
