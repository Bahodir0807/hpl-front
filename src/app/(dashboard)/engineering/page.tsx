'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pagination } from '@/components/ui/pagination';
import { useAuth } from '@/context/auth-context';
import { useEngineeringQueue } from '@/hooks/use-engineering';
import { ENGINEERING_READ_PERMISSION } from '@/lib/engineering';
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { useLabelMaps } from '@/i18n/use-label-maps';

const PAGE_LIMIT = 20;

export default function EngineeringQueuePage() {
  const { t } = useI18n();
  const { leadStatusLabels } = useLabelMaps();
  const { user, isInitialized } = useAuth();
  const [page, setPage] = useState(1);
  const canAccess = Boolean(user?.permissions.includes(ENGINEERING_READ_PERMISSION));
  const filters = useMemo(
    () => ({ page, limit: PAGE_LIMIT, status: 'ACTIVE' as const }),
    [page],
  );
  const queueQuery = useEngineeringQueue(canAccess && isInitialized, filters);
  const items = queueQuery.data?.items ?? [];
  const total = queueQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  if (!isInitialized) {
    return (
      <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
        {t('common.loading')}
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
        {t('engineering.noAccess')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">
          {t('engineering.title')}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{t('engineering.subtitle')}</p>
      </div>

      {queueQuery.isError ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {t('engineering.loadQueueFailed')}
        </div>
      ) : null}

      {!queueQuery.isLoading && items.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          {t('engineering.queueEmpty')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('common.client')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('engineering.objectData')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('engineering.subsystemRequired')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('engineering.installationRequired')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('engineering.engineeringStatus')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('leads.assignedAt')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3">
                    <Link
                      href={`/engineering/leads/${item.id}`}
                      className="font-medium text-slate-950 underline"
                    >
                      {item.client?.name || item.title}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {leadStatusLabels[item.status]}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {item.projectObject?.name || t('common.dash')}
                  </td>
                  <td className="px-3 py-3">
                    {item.ventFacadeKitRequired ? t('common.yes') : t('common.no')}
                  </td>
                  <td className="px-3 py-3">
                    {item.installationRequired ? t('common.yes') : t('common.no')}
                  </td>
                  <td className="px-3 py-3">
                    {t(`statuses.engineeringAssignment.${item.engineering.status}`)}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {formatDateTime(item.engineering.assignedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      ) : null}
    </div>
  );
}
