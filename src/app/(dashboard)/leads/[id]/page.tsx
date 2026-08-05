'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { QualifyLeadModal } from '../../../../components/leads/qualify-lead-modal';
import { UnqualifyLeadModal } from '../../../../components/leads/unqualify-lead-modal';
import {
  Lead,
  LeadStatus,
  useLead,
} from '../../../../hooks/use-leads';

const statusClassName: Record<LeadStatus, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  QUALIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UNQUALIFIED: 'bg-slate-100 text-slate-700 border-slate-200',
  CONVERTED: 'bg-green-50 text-green-700 border-green-200',
};

function formatDate(value?: string | null): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatMoney(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold ${statusClassName[status]}`}
    >
      {status}
    </span>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-slate-500">
        {label}
      </div>
      <div
        className={`mt-1 break-words text-sm text-slate-950 ${
          mono ? 'font-mono text-xs' : ''
        }`}
      >
        {value || '-'}
      </div>
    </div>
  );
}

export default function LeadDetailsPage() {
  const params = useParams<{ id: string }>();
  const leadQuery = useLead(params.id);
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [unqualifyingLead, setUnqualifyingLead] = useState<Lead | null>(null);
  const lead = leadQuery.data;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/leads"
              className="text-sm font-medium text-slate-600 hover:text-slate-950"
            >
              Назад к лидам
            </Link>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              {lead?.title ?? 'Лид'}
            </h2>
            {lead ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={lead.status} />
                <span className="text-sm text-slate-600">{lead.source}</span>
              </div>
            ) : null}
          </div>

          {lead ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQualifyingLead(lead)}
                disabled={lead.status === 'CONVERTED'}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
              >
                Квалифицировать
              </button>
              <button
                type="button"
                onClick={() => setUnqualifyingLead(lead)}
                disabled={lead.status === 'UNQUALIFIED'}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
              >
                Брак
              </button>
            </div>
          ) : null}
        </div>

        {leadQuery.isLoading ? (
          <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Загрузка лида...
          </div>
        ) : null}

        {leadQuery.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Не удалось загрузить лид.
          </div>
        ) : null}

        {lead ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <section className="rounded border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-950">
                Основная информация
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="ID" value={lead.id} mono />
                <Field label="Ответственный" value={lead.ownerId} mono />
                <Field label="Клиент" value={lead.clientId} mono />
                <Field label="Контакт" value={lead.contactId} mono />
                <Field label="Объект" value={lead.projectObjectId} mono />
                <Field label="Сделка" value={lead.dealId} mono />
                <Field
                  label="Оценка суммы"
                  value={formatMoney(lead.estimatedAmount)}
                />
                <Field
                  label="Целевая дата"
                  value={lead.targetDate ? formatDate(lead.targetDate) : '-'}
                />
              </div>
            </section>

            <section className="rounded border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-950">
                История
              </h3>
              <div className="mt-4 space-y-4">
                <Field label="Создан" value={formatDate(lead.createdAt)} />
                <Field label="Обновлен" value={formatDate(lead.updatedAt)} />
                <Field label="Удален" value={formatDate(lead.deletedAt)} />
              </div>
            </section>

            <section className="rounded border border-slate-200 bg-white p-5 xl:col-span-2">
              <h3 className="text-base font-semibold text-slate-950">
                Детали квалификации
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="ЛПР"
                  value={lead.decisionMakerContact}
                />
                <Field
                  label="Причина брака"
                  value={lead.unqualificationReason}
                />
                <div className="md:col-span-2">
                  <Field
                    label="Потребность"
                    value={lead.needDescription}
                  />
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>

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
