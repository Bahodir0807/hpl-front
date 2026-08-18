'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AlertCircle, Plus, RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CreateLeadModal } from '../../../components/leads/create-lead-modal';
import { UnqualifyLeadModal } from '../../../components/leads/unqualify-lead-modal';
import { Button } from '../../../components/ui/button';
import { Pagination } from '../../../components/ui/pagination';
import { SearchCombobox } from '../../../components/ui/search-combobox';
import { useAuth } from '../../../context/auth-context';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { Lead, LeadStatus, useLeads } from '../../../hooks/use-leads';
import { useUsersList } from '../../../hooks/use-users';
import { formatMoney } from '../../../lib/currency';
import {
  resolveEntityName,
  resolveUserName,
} from '../../../lib/display-names';
import { formatDateTime } from '../../../lib/format';
import { leadStatusLabels } from '../../../lib/labels';

const QualifyLeadModal = dynamic(
  () =>
    import('@/components/leads/qualify-lead-modal').then(
      (module) => module.QualifyLeadModal,
    ),
  { ssr: false },
);

const PAGE_LIMIT = 20;

type StatusFilter = 'ALL' | LeadStatus;

type WorkflowState = {
  label: string;
  className: string;
  needsCommercialAction?: boolean;
};

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Все статусы' },
  { value: 'NEW', label: leadStatusLabels.NEW },
  { value: 'IN_PROGRESS', label: leadStatusLabels.IN_PROGRESS },
  { value: 'QUALIFIED', label: leadStatusLabels.QUALIFIED },
  { value: 'UNQUALIFIED', label: leadStatusLabels.UNQUALIFIED },
  { value: 'CONVERTED', label: leadStatusLabels.CONVERTED },
];

const knownSourceOptions = [
  'telegram',
  'website',
  'Сайт компании',
  'Входящий звонок',
  'Рекомендация партнёра',
  'Тендерная площадка',
];

function resolveWorkflowState(lead: Lead): WorkflowState {
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

function sourceLabel(source: string): string {
  if (source === 'telegram') {
    return 'Telegram';
  }

  if (source === 'website') {
    return 'Сайт';
  }

  return source;
}

export default function LeadsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [source, setSource] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [unqualifyingLead, setUnqualifyingLead] = useState<Lead | null>(null);

  const debouncedSearch = useDebouncedValue(search, 400);
  const debouncedSource = useDebouncedValue(source, 400);
  const canFilterOwners =
    Boolean(user?.permissions.includes('leads:read_all')) &&
    Boolean(user?.permissions.includes('users:read'));
  const canCommerciallyQualify =
    user?.permissions.includes('leads:commercial_qualify') ?? false;

  const filters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      status: status === 'ALL' ? undefined : status,
      source: debouncedSource.trim() || undefined,
      ownerId: canFilterOwners ? ownerId || undefined : undefined,
      page,
      limit: PAGE_LIMIT,
    }),
    [canFilterOwners, debouncedSearch, debouncedSource, ownerId, page, status],
  );
  const leadsQuery = useLeads(filters);
  const usersQuery = useUsersList(canFilterOwners, {
    role: 'MANAGER',
    limit: 100,
  });
  const managerOptions = useMemo(
    () => [
      { value: '', label: 'Все менеджеры' },
      ...usersQuery.users
        .filter((manager) => manager.isActive)
        .map((manager) => ({
          value: manager.id,
          label:
            `${manager.firstName} ${manager.lastName}`.trim() || manager.email,
          description: manager.email,
        })),
    ],
    [usersQuery.users],
  );

  const leads = leadsQuery.data?.items ?? [];
  const total = leadsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const hasActiveFilters = Boolean(
    search.trim() || status !== 'ALL' || source.trim() || ownerId,
  );

  const resetFilters = (): void => {
    setSearch('');
    setStatus('ALL');
    setSource('');
    setOwnerId('');
    setPage(1);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Лиды</h2>
            <p className="mt-1 text-sm text-slate-600">
              Заявки и их текущий этап в процессе продаж HPL.
            </p>
          </div>

          <Button type="button" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Создать лид
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-y border-slate-200 bg-white py-3">
          <label className="min-w-[240px] flex-1">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Поиск
            </span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Поиск по лидам..."
                className="w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
            </span>
          </label>

          <label className="w-full sm:w-48">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Статус
            </span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);
                setPage(1);
              }}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="w-full sm:w-52">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Источник
            </span>
            <input
              list="lead-source-options"
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setPage(1);
              }}
              placeholder="Все источники"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <datalist id="lead-source-options">
              {knownSourceOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>

          {canFilterOwners ? (
            <label className="w-full sm:w-64">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Менеджер
              </span>
              <SearchCombobox
                value={ownerId}
                onChange={(nextOwnerId) => {
                  setOwnerId(nextOwnerId);
                  setPage(1);
                }}
                options={managerOptions}
                placeholder="Все менеджеры"
                searchPlaceholder="Поиск менеджера"
                emptyLabel="Менеджеры не найдены"
                loading={usersQuery.isFetching}
              />
            </label>
          ) : null}

          {hasActiveFilters ? (
            <Button type="button" variant="outline" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Сбросить
            </Button>
          ) : null}
        </div>

        <div className="flex min-h-5 items-center justify-between text-xs text-slate-500">
          <span>{leadsQuery.data ? `Найдено: ${total}` : null}</span>
          <span aria-live="polite">
            {leadsQuery.isFetching && !leadsQuery.isLoading
              ? 'Обновляем список...'
              : null}
          </span>
        </div>

        {leadsQuery.isLoading ? (
          <div className="border-y border-slate-200 bg-white p-6 text-sm text-slate-600">
            Загрузка лидов...
          </div>
        ) : null}

        {leadsQuery.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <span>Не удалось загрузить лиды.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void leadsQuery.refetch()}
            >
              Повторить
            </Button>
          </div>
        ) : null}

        {!leadsQuery.isLoading && !leadsQuery.isError && leads.length === 0 ? (
          <div className="border-y border-slate-200 bg-white p-8 text-center">
            <div className="text-sm font-medium text-slate-900">
              {hasActiveFilters ? 'По текущим фильтрам лидов нет' : 'Лидов пока нет'}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {hasActiveFilters
                ? 'Измените условия поиска или сбросьте фильтры.'
                : 'Создайте первый лид, чтобы начать работу.'}
            </div>
          </div>
        ) : null}

        {!leadsQuery.isLoading && !leadsQuery.isError && leads.length > 0 ? (
          <div className="overflow-x-auto border-y border-slate-200 bg-white">
            <table className="min-w-[980px] w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Лид / клиент
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Источник
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Ответственный
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Этап HPL
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Оценка / создан
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leads.map((lead) => {
                  const workflow = resolveWorkflowState(lead);
                  const needsAction =
                    workflow.needsCommercialAction && canCommerciallyQualify;

                  return (
                    <tr
                      key={lead.id}
                      className={`align-top ${
                        needsAction ? 'bg-orange-50/40' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="px-3 py-3">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-medium text-slate-950 hover:underline"
                        >
                          {lead.title}
                        </Link>
                        <div className="mt-1 text-xs text-slate-600">
                          {resolveEntityName(lead.client, lead.clientId, 'Клиент не указан')}
                        </div>
                        {lead.projectObject || lead.projectObjectId ? (
                          <div className="mt-0.5 text-xs text-slate-500">
                            {resolveEntityName(lead.projectObject, lead.projectObjectId)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {sourceLabel(lead.source)}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {resolveUserName(lead.owner, lead.ownerId)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${workflow.className}`}
                        >
                          {workflow.label}
                        </span>
                        {needsAction ? (
                          <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-orange-700">
                            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Требует действия
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-slate-700">
                          {formatMoney(lead.estimatedAmount)}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {formatDateTime(lead.createdAt)}
                        </div>
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
                            Открыть
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {!leadsQuery.isError ? (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
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
