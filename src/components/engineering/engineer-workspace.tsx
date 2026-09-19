'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ENGINEERING_COMPLETE_PERMISSION,
  ENGINEERING_RETURN_PERMISSION,
} from '@/lib/engineering';
import { isHttpAccessDenied } from '@/lib/errors';
import {
  useCompleteEngineeringQualification,
  useEngineeringWorkspace,
  useReturnEngineeringLead,
} from '@/hooks/use-engineering';
import { useAuth } from '@/context/auth-context';
import { useDownloadFile } from '@/hooks/use-upload';
import {
  displayContactValue,
  mergeContactSources,
  resolveClientContactPresentation,
} from '@/lib/client-contact';
import { formatPersonName } from '@/lib/display-names';
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { useLabelMaps } from '@/i18n/use-label-maps';

type WorkspaceOutcome = 'returned' | 'completed';

function yesNo(value: boolean | null | undefined, t: (key: string) => string) {
  if (value === true) {
    return t('common.yes');
  }
  if (value === false) {
    return t('common.no');
  }
  return t('common.dash');
}

function EngineeringClosedState({
  title,
  variant,
}: {
  title: string;
  variant: 'success' | 'no-access';
}) {
  const { t } = useI18n();
  const isSuccess = variant === 'success';

  return (
    <div
      role="status"
      className={
        isSuccess
          ? 'rounded border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900'
          : 'rounded border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700'
      }
    >
      <p>{title}</p>
      <Link
        href="/engineering"
        className="mt-4 inline-flex rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        {t('engineering.backToQueue')}
      </Link>
    </div>
  );
}

export function EngineerWorkspace({ leadId }: { leadId: string }) {
  const { t, messages } = useI18n();
  const { leadStatusLabels } = useLabelMaps();
  const { user } = useAuth();
  const [outcome, setOutcome] = useState<WorkspaceOutcome | null>(null);
  const workspaceQuery = useEngineeringWorkspace(leadId, outcome === null);
  const returnLead = useReturnEngineeringLead();
  const complete = useCompleteEngineeringQualification();
  const download = useDownloadFile();
  const [returnReason, setReturnReason] = useState('');
  const [isReturnOpen, setIsReturnOpen] = useState(false);

  const permissions = user?.permissions ?? [];
  const canReturn = permissions.includes(ENGINEERING_RETURN_PERMISSION);
  const canComplete = permissions.includes(ENGINEERING_COMPLETE_PERMISSION);

  if (outcome === 'returned') {
    return (
      <EngineeringClosedState
        variant="success"
        title={t('engineering.workspaceReturned')}
      />
    );
  }

  if (outcome === 'completed') {
    return (
      <EngineeringClosedState
        variant="success"
        title={t('engineering.workspaceCompleted')}
      />
    );
  }

  if (workspaceQuery.isLoading) {
    return (
      <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
        {t('engineering.loadingWorkspace')}
      </div>
    );
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    if (isHttpAccessDenied(workspaceQuery.error)) {
      return (
        <EngineeringClosedState
          variant="no-access"
          title={t('engineering.workspaceNoAccess')}
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {t('engineering.loadWorkspaceFailed')}
        </div>
        <Link
          href="/engineering"
          className="inline-flex text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          {t('engineering.backToQueue')}
        </Link>
      </div>
    );
  }

  const { lead, qualification, engineering, files, activities } =
    workspaceQuery.data;
  const contactPresentation = resolveClientContactPresentation({
    client: mergeContactSources(lead.client),
    contact: mergeContactSources(lead.contact),
  });
  const isActive = engineering?.status === 'ACTIVE';

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/engineering"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          {t('engineering.backToQueue')}
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          {lead.client?.name || t('common.client')}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{lead.title}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5">
            {leadStatusLabels[lead.status]}
          </span>
          {engineering ? (
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5">
              {t(`statuses.engineeringAssignment.${engineering.status}`)}
            </span>
          ) : null}
        </div>
      </div>

      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-950">
          {t('engineering.clientData')}
        </h3>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">{t('common.client')}</dt>
            <dd>{lead.client?.name || messages.common.dash}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('common.phone')}</dt>
            <dd>{displayContactValue(contactPresentation.phone)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('common.email')}</dt>
            <dd>{displayContactValue(contactPresentation.email)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('common.manager')}</dt>
            <dd>
              {lead.owner
                ? formatPersonName(lead.owner, lead.owner.email ?? undefined)
                : messages.common.dash}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-950">
          {t('engineering.objectData')}
        </h3>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">{t('common.titleField')}</dt>
            <dd>
              {lead.projectObject?.name || messages.common.dash}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('common.address')}</dt>
            <dd>{lead.projectObject?.address ?? messages.common.dash}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-950">
          {t('engineering.managerQualification')}
        </h3>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">{t('engineering.subsystemRequired')}</dt>
            <dd>{yesNo(qualification?.ventFacadeKitRequired, t)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">
              {t('engineering.installationRequired')}
            </dt>
            <dd>{yesNo(qualification?.installationRequired, t)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">{t('engineering.notes')}</dt>
            <dd className="whitespace-pre-wrap">
              {lead.needDescription || messages.common.dash}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-950">
          {t('engineering.technicalData')}
        </h3>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          {(qualification?.items ?? []).length > 0 ? (
            qualification?.items?.map((item, index) => (
              <div
                key={item.id ?? `${item.colorCode ?? 'item'}-${index}`}
                className="rounded border border-slate-100 p-3"
              >
                <p className="font-medium">
                  {item.panelType?.displayNameRu ??
                    item.application ??
                    t('leads.itemPosition', { number: index + 1 })}
                </p>
                <p className="text-xs text-slate-500">
                  {[
                    item.thicknessMm ? `${item.thicknessMm} mm` : null,
                    item.panelSize?.displayName,
                    item.colorName || item.colorCode,
                    item.requiredAreaM2 ? `${item.requiredAreaM2} m²` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            ))
          ) : (
            <p>{messages.common.noData}</p>
          )}
        </div>
      </section>

      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-950">
          {t('engineering.documents')}
        </h3>
        {files.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            {t('engineering.noDocuments')}
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {files.map((file) => (
              <li key={file.id}>
                <button
                  type="button"
                  className="text-left text-slate-700 underline"
                  onClick={() =>
                    download.mutate({
                      id: file.id,
                      originalName: file.originalName,
                      mimeType: file.mimeType,
                      size: file.size,
                      url: `/files/${file.id}`,
                    })
                  }
                >
                  {file.originalName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isActive ? (
        <section className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t('engineering.completeHint')}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {canComplete ? (
              <Button
                type="button"
                disabled={complete.isPending}
                onClick={() => {
                  void complete.mutateAsync(leadId).then(() => {
                    setOutcome('completed');
                  });
                }}
              >
                {t('engineering.completeQualification')}
              </Button>
            ) : null}
            {canReturn ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReturnOpen(true)}
              >
                {t('engineering.returnToManager')}
              </Button>
            ) : null}
          </div>
          {isReturnOpen ? (
            <div className="mt-3 space-y-2">
              <label className="block text-sm text-slate-700">
                {t('engineering.returnReason')}
                <textarea
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
                  rows={3}
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                  placeholder={t('engineering.returnReasonPlaceholder')}
                />
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={returnReason.trim().length < 3 || returnLead.isPending}
                  onClick={() => {
                    void returnLead
                      .mutateAsync({ leadId, reason: returnReason.trim() })
                      .then(() => {
                        setIsReturnOpen(false);
                        setReturnReason('');
                        setOutcome('returned');
                      });
                  }}
                >
                  {t('engineering.returnToManager')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsReturnOpen(false)}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-950">
          {t('leads.activityHistory')}
        </h3>
        {activities.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{t('leads.noEvents')}</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {activities.map((activity) => (
              <li key={activity.id}>
                <p>{activity.content || messages.common.dash}</p>
                <p className="text-xs text-slate-500">
                  {formatDateTime(activity.createdAt)}
                  {activity.author
                    ? ` · ${formatPersonName(activity.author)}`
                    : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
