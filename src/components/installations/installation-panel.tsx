'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Messages } from '@/i18n/types';
import { useI18n } from '@/i18n/provider';
import { useAuth } from '@/context/auth-context';
import type { Deal, DealInstallation } from '@/hooks/use-deals';
import {
  toDealInstallation,
  useConfirmSupervisorInstallation,
  useDealInstallation,
  useScheduleInstallation,
  useUpdateInstallationAssessment,
  type InstallationJob,
} from '@/hooks/use-installations';
import { useUsersList } from '@/hooks/use-users';
import { dealWorkspaceHref } from '@/lib/entity-routes';
import {
  formatPersonName,
  resolveEntityName,
  resolveUserName,
} from '@/lib/display-names';
import { formatDateTime } from '@/lib/format';
import {
  canAssessInstallation,
  canScheduleInstallation,
  canSupervisorConfirmInstallation,
  compactInstallationId,
  dateTimeLocalToIso,
  installationJobTitle,
  installationStatusLabel,
  isInstallationCompleted,
  isInstallationJobMaterialsDelivered,
  isInstallationRequired,
  isMaterialDeliveredToClient,
  shouldShowScheduleControls,
  shouldShowSupervisorConfirmAction,
  toDateTimeLocalValue,
} from '@/lib/installation-presentation';

type InstallationPanelProps = {
  dealId: string;
  deal?: Deal | null;
  installation?: DealInstallation | null;
  job?: InstallationJob | null;
  dealReadable?: boolean;
  highlighted?: boolean;
};

function Fact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="truncate text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function deliveryCopy(
  delivered: boolean | null,
  messages: Messages,
): string {
  if (delivered === null) {
    return messages.installations.deliveryUnknown;
  }

  return delivered
    ? messages.installations.materialDeliveredToClient
    : messages.errors.materialNotDelivered;
}

function ScheduleForm({
  installation,
  pending,
  onSubmit,
}: {
  installation?: DealInstallation | null;
  pending: boolean;
  onSubmit: (payload: {
    expectedInstallationAt: string;
    expectedCompletionAt: string;
  }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [expectedInstallationAt, setExpectedInstallationAt] = useState(
    toDateTimeLocalValue(installation?.expectedInstallationAt),
  );
  const [expectedCompletionAt, setExpectedCompletionAt] = useState(
    toDateTimeLocalValue(installation?.expectedCompletionAt),
  );

  const saveSchedule = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const startAt = dateTimeLocalToIso(expectedInstallationAt);
    const endAt = dateTimeLocalToIso(expectedCompletionAt);
    if (!startAt || !endAt) {
      return;
    }

    await onSubmit({
      expectedInstallationAt: startAt,
      expectedCompletionAt: endAt,
    });
  };

  return (
    <form className="space-y-3 border-t border-slate-200 pt-3" onSubmit={saveSchedule}>
      <h4 className="text-sm font-semibold text-slate-900">
        {t('installations.scheduleTitle')}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-slate-700">
          <span className="mb-1 block font-medium">{t('installations.installDate')}</span>
          <input
            type="datetime-local"
            required
            value={expectedInstallationAt}
            onChange={(event) => setExpectedInstallationAt(event.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>
        <label className="block text-sm text-slate-700">
          <span className="mb-1 block font-medium">{t('installations.completionDate')}</span>
          <input
            type="datetime-local"
            required
            value={expectedCompletionAt}
            onChange={(event) => setExpectedCompletionAt(event.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {installation ? t('installations.saveDates') : t('installations.schedule')}
      </Button>
    </form>
  );
}

function AssessmentForm({
  installation,
  pending,
  onSubmit,
}: {
  installation: DealInstallation;
  pending: boolean;
  onSubmit: (payload: {
    assessmentComment: string;
    workComment: string;
  }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [assessmentComment, setAssessmentComment] = useState(
    installation.assessmentComment ?? '',
  );
  const [workComment, setWorkComment] = useState(installation.workComment ?? '');

  const saveAssessment = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    await onSubmit({ assessmentComment, workComment });
  };

  return (
    <form className="space-y-3 border-t border-slate-200 pt-3" onSubmit={saveAssessment}>
      <h4 className="text-sm font-semibold text-slate-900">
        {t('installations.assessmentTitle')}
      </h4>
      <label className="block text-sm text-slate-700">
        <span className="mb-1 block font-medium">{t('installations.assessmentComment')}</span>
        <textarea
          value={assessmentComment}
          onChange={(event) => setAssessmentComment(event.target.value)}
          rows={3}
          maxLength={4000}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </label>
      <label className="block text-sm text-slate-700">
        <span className="mb-1 block font-medium">{t('installations.workComment')}</span>
        <textarea
          value={workComment}
          onChange={(event) => setWorkComment(event.target.value)}
          rows={3}
          maxLength={4000}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {t('installations.saveAssessment')}
      </Button>
    </form>
  );
}

export function InstallationPanel({
  dealId,
  deal,
  installation: installationProp,
  job,
  dealReadable = true,
  highlighted = false,
}: InstallationPanelProps) {
  const { t, messages } = useI18n();
  const { user } = useAuth();
  const installationQuery = useDealInstallation(job ? null : dealId);
  const schedule = useScheduleInstallation();
  const assess = useUpdateInstallationAssessment();
  const confirmSupervisor = useConfirmSupervisorInstallation();
  const { usersById } = useUsersList(
    !job && (user?.permissions.includes('users:read') ?? false),
  );

  const installation = job
    ? toDealInstallation(job)
    : installationQuery.data !== undefined
      ? installationQuery.data
      : (installationProp ?? deal?.installation ?? null);
  const required = job
    ? true
    : isInstallationRequired(deal?.installationRequiredSnapshot);
  const delivered = job
    ? isInstallationJobMaterialsDelivered(job)
    : dealReadable
      ? isMaterialDeliveredToClient(deal ?? null)
      : null;
  const canOpenDeal =
    Boolean(job) &&
    (canScheduleInstallation(user) || canSupervisorConfirmInstallation(user));
  const actor = (
    userId?: string | null,
    person?: { firstName: string; lastName: string } | null,
  ) =>
    person
      ? formatPersonName(person)
      : resolveUserName(
          undefined,
          userId,
          usersById,
          userId ? compactInstallationId(userId) : t('common.dash'),
        );
  const title = job
    ? installationJobTitle(job, messages)
    : dealReadable
      ? t('installations.dealTitle', {
          deal: deal?.title ?? t('deals.fallback'),
          client: resolveEntityName(deal?.client, deal?.clientId),
        })
      : t('installations.dealFallback', {
          id: compactInstallationId(dealId),
        });
  const objectAddress = job?.deal.projectObject?.address?.trim();
  const dealCompletedAt =
    job?.dealCompletedAt ?? job?.deal.completedAt ?? deal?.completedAt;

  const showSchedule = shouldShowScheduleControls(user, installation);
  const showSupervisorConfirm = shouldShowSupervisorConfirmAction(
    user,
    installation,
  );
  const showAssess = canAssessInstallation(user) && Boolean(installation);
  const pending = useMemo(
    () =>
      schedule.isPending ||
      assess.isPending ||
      confirmSupervisor.isPending,
    [assess.isPending, confirmSupervisor.isPending, schedule.isPending],
  );

  if (deal && !required) {
    return (
      <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        {t('installations.notRequired')}
      </div>
    );
  }

  return (
    <div
      id={`installation-${installation?.id ?? dealId}`}
      className={`space-y-4 rounded border p-4 ${
        highlighted
          ? 'border-slate-900 ring-1 ring-slate-900'
          : 'border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">{t('installations.panelTitle')}</h3>
          <p className="mt-1 truncate text-xs text-slate-500">{title}</p>
          {job?.deal.client.phone ? (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {job.deal.client.phone}
            </p>
          ) : null}
          {objectAddress ? (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {job?.deal.projectObject?.name
                ? `${job.deal.projectObject.name} · ${objectAddress}`
                : objectAddress}
            </p>
          ) : null}
          {canOpenDeal ? (
            <Link
              href={dealWorkspaceHref({ dealId, installation: true })}
              className="mt-1 inline-block text-xs font-medium text-slate-700 underline underline-offset-2"
            >
              {t('installations.openDeal')}
            </Link>
          ) : null}
        </div>
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {installation
            ? installationStatusLabel(installation.status, messages)
            : t('installations.notScheduled')}
        </span>
      </div>

      <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {deliveryCopy(delivered, messages)}
      </div>

      {installationQuery.isLoading && !installation ? (
        <div className="text-sm text-slate-600">{t('installations.loadingOne')}</div>
      ) : null}

      {installation ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Fact
            label={t('installations.expectedInstallDate')}
            value={formatDateTime(installation.expectedInstallationAt)}
          />
          <Fact
            label={t('installations.expectedCompletionDate')}
            value={formatDateTime(installation.expectedCompletionAt)}
          />
          <Fact
            label={t('installations.assessmentLabel')}
            value={
              installation.assessedAt
                ? `${formatDateTime(installation.assessedAt)} · ${actor(installation.assessedById, job?.assessedBy)}`
                : t('installations.assessmentEmpty')
            }
          />
          <Fact
            label={t('installations.workStarted')}
            value={
              installation.startedAt
                ? `${formatDateTime(installation.startedAt)} · ${actor(installation.startedById, job?.startedBy)}`
                : t('installations.notStarted')
            }
          />
          <Fact
            label={t('installations.supervisorConfirm')}
            value={
              installation.supervisorConfirmedAt
                ? `${formatDateTime(installation.supervisorConfirmedAt)} · ${actor(installation.supervisorConfirmedById, job?.supervisorConfirmedBy)}`
                : t('installations.supervisorPending')
            }
          />
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          {t('installations.notScheduledYet')}
        </p>
      )}

      {installation?.assessmentComment ? (
        <p className="text-sm text-slate-700">
          <span className="font-medium">{t('installations.assessmentComment')}: </span>
          {installation.assessmentComment}
        </p>
      ) : null}
      {installation?.workComment ? (
        <p className="text-sm text-slate-700">
          <span className="font-medium">{t('installations.workComment')}: </span>
          {installation.workComment}
        </p>
      ) : null}

      {dealCompletedAt ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t('installations.dealCompletedAt', {
            date: formatDateTime(dealCompletedAt),
          })}
        </div>
      ) : isInstallationCompleted(installation) ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t('installations.completedAt', {
            date: formatDateTime(installation?.completedAt),
          })}
        </div>
      ) : null}

      {showSchedule ? (
        <ScheduleForm
          key={`${installation?.id ?? 'new'}:${installation?.expectedInstallationAt ?? ''}:${installation?.expectedCompletionAt ?? ''}`}
          installation={installation}
          pending={pending}
          onSubmit={async (payload) => {
            await schedule.mutateAsync({ dealId, ...payload });
          }}
        />
      ) : null}

      {showAssess && installation ? (
        <AssessmentForm
          key={`${installation.id}:${installation.assessmentComment ?? ''}:${installation.workComment ?? ''}`}
          installation={installation}
          pending={pending}
          onSubmit={async (payload) => {
            await assess.mutateAsync({ dealId, ...payload });
          }}
        />
      ) : null}

      {showSupervisorConfirm ? (
        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
          {showSupervisorConfirm ? (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => {
                void confirmSupervisor.mutateAsync({ dealId });
              }}
            >
              {t('installations.confirmAsHead')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
