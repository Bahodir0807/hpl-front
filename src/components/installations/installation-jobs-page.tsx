'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { InstallationPanel } from '@/components/installations/installation-panel';
import { Pagination } from '@/components/ui/pagination';
import { useAuth } from '@/context/auth-context';
import {
  useInstallationJob,
  useInstallationJobs,
} from '@/hooks/use-installations';
import { formatDateTime } from '@/lib/format';
import {
  getInstallationErrorMessage,
  isInstallationForbiddenError,
  isInstallationNotFoundError,
} from '@/lib/installation-errors';
import {
  installationJobClientName,
  installationJobTitle,
  installationStatusLabel,
  isInstallationJobMaterialsDelivered,
} from '@/lib/installation-presentation';
import { installationWorkspaceHref } from '@/lib/entity-routes';
import { useI18n } from '@/i18n/provider';

const PAGE_LIMIT = 20;

export function InstallationJobsPage() {
  const { t, messages } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const selectedInstallationId = searchParams.get('installationId');
  const selectedDealId = searchParams.get('dealId');
  const jobsQuery = useInstallationJobs(
    { page, limit: PAGE_LIMIT, requiringAction: true },
    Boolean(user),
  );
  const jobQuery = useInstallationJob(selectedInstallationId);

  const jobs = jobsQuery.data?.items ?? [];
  const total = jobsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const selectedFromList = jobs.find((job) => {
    if (selectedInstallationId && job.id === selectedInstallationId) {
      return true;
    }
    if (
      !selectedInstallationId &&
      selectedDealId &&
      job.dealId === selectedDealId
    ) {
      return true;
    }
    return false;
  });
  const selectedJob = selectedInstallationId
    ? (jobQuery.data ?? selectedFromList ?? null)
    : (selectedFromList ?? jobs[0] ?? null);

  useEffect(() => {
    if (!selectedJob?.id || selectedInstallationId) {
      return;
    }

    if (selectedDealId && selectedJob.dealId === selectedDealId) {
      router.replace(
        installationWorkspaceHref({
          dealId: selectedJob.dealId,
          installationId: selectedJob.id,
        }),
        { scroll: false },
      );
    }
  }, [
    router,
    selectedDealId,
    selectedInstallationId,
    selectedJob?.dealId,
    selectedJob?.id,
  ]);

  const openJob = (installationId: string, dealId: string): void => {
    router.replace(
      installationWorkspaceHref({
        dealId,
        installationId,
      }),
      { scroll: false },
    );
  };

  if (jobsQuery.isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-64 rounded bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-200" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded border border-slate-200 bg-white"
          />
        ))}
      </div>
    );
  }

  if (jobsQuery.isError) {
    const forbidden = isInstallationForbiddenError(jobsQuery.error);
    return (
      <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {forbidden
          ? t('installations.viewForbidden')
          : getInstallationErrorMessage(jobsQuery.error, messages) ||
            t('installations.jobsLoadFailed')}
      </div>
    );
  }

  const detailNotFound =
    Boolean(selectedInstallationId) &&
    jobQuery.isError &&
    isInstallationNotFoundError(jobQuery.error);
  const detailForbidden =
    Boolean(selectedInstallationId) &&
    jobQuery.isError &&
    isInstallationForbiddenError(jobQuery.error);
  const detailError =
    Boolean(selectedInstallationId) &&
    jobQuery.isError &&
    !detailNotFound &&
    !detailForbidden;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">{t('installations.title')}</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          {t('installations.subtitle')}
        </p>
      </div>

      {jobs.length === 0 && !selectedJob && !selectedInstallationId ? (
        <div className="rounded border border-slate-200 bg-white p-8 text-center text-sm text-slate-700">
          {t('installations.empty')}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="space-y-2">
            {jobs.length === 0 ? (
              <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
                {t('installations.empty')}
              </div>
            ) : (
              jobs.map((job) => {
                const delivered = isInstallationJobMaterialsDelivered(job);
                const isActive =
                  job.id === selectedJob?.id ||
                  job.id === selectedInstallationId;

                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => openJob(job.id, job.dealId)}
                    className={`w-full rounded border p-3 text-left ${
                      isActive
                        ? 'border-slate-900 bg-white'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950">
                          {installationJobTitle(job, messages)}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          {installationJobClientName(job)}
                        </div>
                      </div>
                      <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {installationStatusLabel(job.status, messages)}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>
                        {t('installations.expectedAt', {
                          date: formatDateTime(job.expectedInstallationAt),
                        })}
                      </div>
                      <div>
                        {t('installations.completionAt', {
                          date: formatDateTime(job.expectedCompletionAt),
                        })}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                        {delivered
                          ? t('installations.materialDelivered')
                          : t('installations.materialNotDelivered')}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                        {t('installations.assessment', {
                          value: job.assessedAt
                            ? t('installations.assessmentYes')
                            : t('installations.assessmentNo'),
                        })}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                        {t('installations.supervisor', {
                          value: job.supervisorConfirmedAt
                            ? t('installations.yes')
                            : t('installations.no'),
                        })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
            />
          </div>

          {detailNotFound ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              {t('errors.installationNotFound')}
            </div>
          ) : detailForbidden ? (
            <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {t('installations.viewForbidden')}
            </div>
          ) : detailError ? (
            <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {getInstallationErrorMessage(jobQuery.error, messages)}
            </div>
          ) : jobQuery.isLoading && selectedInstallationId && !selectedJob ? (
            <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
              {t('installations.loadingJob')}
            </div>
          ) : selectedJob ? (
            <InstallationPanel
              dealId={selectedJob.dealId}
              job={selectedJob}
              highlighted
            />
          ) : (
            <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              {t('installations.selectJob')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
