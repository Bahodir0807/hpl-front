'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AlertCircle, Plus, RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CreateLeadModal } from '../../../components/leads/create-lead-modal';
import { UnqualifyLeadModal } from '../../../components/leads/unqualify-lead-modal';
import { LoseOpportunityModal } from '../../../components/opportunities/lose-opportunity-modal';
import { Button } from '../../../components/ui/button';
import { Pagination } from '../../../components/ui/pagination';
import { SearchCombobox } from '../../../components/ui/search-combobox';
import { useAuth } from '../../../context/auth-context';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { Lead, LeadStatus, useLeads, useLoseLead } from '../../../hooks/use-leads';
import { useUsersList } from '../../../hooks/use-users';
import { formatMoney } from '../../../lib/currency';
import {
  resolveEntityName,
  resolveUserName,
} from '../../../lib/display-names';
import { formatDateTime } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/errors';
import { lossReasonLabel } from '../../../lib/loss-reasons';
import { resolveLeadWorkflowState } from '../../../lib/lead-workflow';
import { useI18n } from '@/i18n/provider';
import { useLabelMaps } from '@/i18n/use-label-maps';
import type { TranslateFn } from '@/i18n/translate';

const QualifyLeadModal = dynamic(
  () =>
    import('@/components/leads/qualify-lead-modal').then(
      (module) => module.QualifyLeadModal,
    ),
  { ssr: false },
);

const PAGE_LIMIT = 20;

type StatusFilter = 'ALL' | LeadStatus;

const knownSourceOptions = [
  'telegram',
  'website',
  'Сайт компании',
  'Входящий звонок',
  'Рекомендация партнёра',
  'Тендерная площадка',
];

function sourceLabel(source: string, t: TranslateFn): string {
  if (source === 'telegram') {
    return 'Telegram';
  }

  if (source === 'website') {
    return t('leads.website');
  }

  if (source === 'Сайт компании') {
    return t('leads.websiteCompany');
  }

  if (source === 'Входящий звонок') {
    return t('leads.incomingCall');
  }

  if (source === 'Рекомендация партнёра') {
    return t('leads.partnerReferral');
  }

  if (source === 'Тендерная площадка') {
    return t('leads.tender');
  }

  return source;
}

export default function LeadsPage() {
  const { t, locale, messages } = useI18n();
  const labels = useLabelMaps();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [source, setSource] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [unqualifyingLead, setUnqualifyingLead] = useState<Lead | null>(null);
  const [losingLead, setLosingLead] = useState<Lead | null>(null);

  const debouncedSearch = useDebouncedValue(search, 400);
  const debouncedSource = useDebouncedValue(source, 400);
  const canFilterOwners =
    Boolean(user?.permissions.includes('leads:read_all')) &&
    Boolean(user?.permissions.includes('users:read'));
  const canCommerciallyQualify =
    user?.permissions.includes('leads:commercial_qualify') ?? false;
  const canLoseLead = user?.permissions.includes('leads:update') ?? false;

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
  const loseLead = useLoseLead();
  const usersQuery = useUsersList(canFilterOwners, {
    role: 'MANAGER',
    limit: 100,
  });
  const statusOptions = useMemo(
    (): { value: StatusFilter; label: string }[] => [
      { value: 'ALL', label: t('common.allStatuses') },
      { value: 'NEW', label: labels.leadStatusLabels.NEW },
      { value: 'IN_PROGRESS', label: labels.leadStatusLabels.IN_PROGRESS },
      { value: 'QUALIFIED', label: labels.leadStatusLabels.QUALIFIED },
      { value: 'UNQUALIFIED', label: labels.leadStatusLabels.UNQUALIFIED },
      { value: 'LOST', label: labels.leadStatusLabels.LOST },
      { value: 'CONVERTED', label: labels.leadStatusLabels.CONVERTED },
    ],
    [labels.leadStatusLabels, t],
  );
  const managerOptions = useMemo(
    () => [
      { value: '', label: t('common.allManagers') },
      ...usersQuery.users
        .filter((manager) => manager.isActive)
        .map((manager) => ({
          value: manager.id,
          label:
            `${manager.firstName} ${manager.lastName}`.trim() || manager.email,
          description: manager.email,
        })),
    ],
    [t, usersQuery.users],
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
            <h2 className="text-xl font-semibold text-slate-950">
              {t('leads.title')}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t('leads.subtitle')}</p>
          </div>

          <Button type="button" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('leads.create')}
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-y border-slate-200 bg-white py-3">
          <label className="min-w-[240px] flex-1">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {t('common.search')}
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
                placeholder={t('leads.searchPlaceholder')}
                className="w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
            </span>
          </label>

          <label className="w-full sm:w-48">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {t('common.status')}
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
              {t('leads.source')}
            </span>
            <input
              list="lead-source-options"
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setPage(1);
              }}
              placeholder={t('common.allSources')}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <datalist id="lead-source-options">
              {knownSourceOptions.map((option) => (
                <option key={option} value={option}>
                  {sourceLabel(option, t)}
                </option>
              ))}
            </datalist>
          </label>

          {canFilterOwners ? (
            <label className="w-full sm:w-64">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t('leads.manager')}
              </span>
              <SearchCombobox
                value={ownerId}
                onChange={(nextOwnerId) => {
                  setOwnerId(nextOwnerId);
                  setPage(1);
                }}
                options={managerOptions}
                placeholder={t('common.allManagers')}
                searchPlaceholder={t('leads.searchManager')}
                emptyLabel={t('leads.managersEmpty')}
                loading={usersQuery.isFetching}
              />
            </label>
          ) : null}

          {hasActiveFilters ? (
            <Button type="button" variant="outline" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('common.reset')}
            </Button>
          ) : null}
        </div>

        <div className="flex min-h-5 items-center justify-between text-xs text-slate-500">
          <span>
            {leadsQuery.data ? t('common.found', { count: total }) : null}
          </span>
          <span aria-live="polite">
            {leadsQuery.isFetching && !leadsQuery.isLoading
              ? t('common.updatingList')
              : null}
          </span>
        </div>

        {leadsQuery.isLoading ? (
          <div className="border-y border-slate-200 bg-white p-6 text-sm text-slate-600">
            {t('leads.loading')}
          </div>
        ) : null}

        {leadsQuery.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <span>{t('leads.loadFailed')}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void leadsQuery.refetch()}
            >
              {t('common.retry')}
            </Button>
          </div>
        ) : null}

        {!leadsQuery.isLoading && !leadsQuery.isError && leads.length === 0 ? (
          <div className="border-y border-slate-200 bg-white p-8 text-center">
            <div className="text-sm font-medium text-slate-900">
              {hasActiveFilters ? t('leads.emptyFiltered') : t('leads.empty')}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {hasActiveFilters
                ? t('leads.emptyFilteredHint')
                : t('leads.emptyHint')}
            </div>
          </div>
        ) : null}

        {!leadsQuery.isLoading && !leadsQuery.isError && leads.length > 0 ? (
          <div className="overflow-x-auto border-y border-slate-200 bg-white">
            <table className="min-w-[980px] w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t('leads.columnLead')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t('leads.columnSource')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t('leads.columnOwner')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t('leads.columnStage')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t('leads.columnEstimate')}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leads.map((lead) => {
                  const workflow = resolveLeadWorkflowState(lead, messages);
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
                          {resolveEntityName(
                            lead.client,
                            lead.clientId,
                            t('leads.clientMissing'),
                          )}
                        </div>
                        {lead.projectObject || lead.projectObjectId ? (
                          <div className="mt-0.5 text-xs text-slate-500">
                            {resolveEntityName(lead.projectObject, lead.projectObjectId)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {sourceLabel(lead.source, t)}
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
                            {t('leads.needsAction')}
                          </div>
                        ) : null}
                        {lead.status === 'LOST' ? (
                          <div className="mt-1 text-xs text-slate-500">
                            {lossReasonLabel(lead.lostReasonCode, messages)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-slate-700">
                          {formatMoney(lead.estimatedAmount)}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {formatDateTime(lead.createdAt, locale)}
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
                            {t('leads.qualify')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setUnqualifyingLead(lead)}
                            disabled={
                              lead.status === 'UNQUALIFIED' ||
                              lead.status === 'LOST'
                            }
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                          >
                            {t('leads.unqualify')}
                          </button>
                          {canLoseLead ? (
                            <button
                              type="button"
                              onClick={() => setLosingLead(lead)}
                              disabled={
                                lead.status === 'LOST' ||
                                lead.status === 'CONVERTED'
                              }
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                            >
                              {t('leads.lost')}
                            </button>
                          ) : null}
                          <Link
                            href={`/leads/${lead.id}`}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {t('common.open')}
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
      <LoseOpportunityModal
        isOpen={Boolean(losingLead)}
        title={losingLead?.title ?? ''}
        entityLabel={t('leads.entityLabel')}
        pending={loseLead.isPending}
        error={loseLead.isError ? getErrorMessage(loseLead.error, undefined, messages) : null}
        onClose={() => setLosingLead(null)}
        onSubmit={async (payload) => {
          if (!losingLead) {
            return;
          }
          await loseLead.mutateAsync({
            id: losingLead.id,
            reason: payload.reason,
            comment: payload.comment,
          });
          setLosingLead(null);
        }}
      />
    </>
  );
}
