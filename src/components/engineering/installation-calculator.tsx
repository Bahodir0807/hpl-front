'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { canUpdateInstallationTechnical } from '@/lib/installation-pricing';
import { useAuth } from '@/context/auth-context';
import {
  useInstallationComplete,
  useInstallationSaveDraft,
  useInstallationWorkspace,
  type InstallationQuantitySource,
  type InstallationWorkType,
} from '@/hooks/use-installation-calculation';
import { useI18n } from '@/i18n/provider';

function localizedName(
  item: { nameRu: string; nameEn: string; nameUz: string },
  locale: string,
) {
  if (locale === 'en') {
    return item.nameEn;
  }
  if (locale === 'uz') {
    return item.nameUz;
  }
  return item.nameRu;
}

function unitLabel(
  unit: string,
  t: (key: `engineering.installationUnit${'M2' | 'Lm' | 'Pcs' | 'Set' | 'Hour' | 'Day' | 'Other'}`) => string,
) {
  if (unit === 'M2') return t('engineering.installationUnitM2');
  if (unit === 'LM') return t('engineering.installationUnitLm');
  if (unit === 'PCS') return t('engineering.installationUnitPcs');
  if (unit === 'SET') return t('engineering.installationUnitSet');
  if (unit === 'HOUR') return t('engineering.installationUnitHour');
  if (unit === 'DAY') return t('engineering.installationUnitDay');
  return t('engineering.installationUnitOther');
}

type DraftItem = {
  key: string;
  workTypeId: string;
  quantity: string;
  quantitySource: InstallationQuantitySource;
  note: string;
};

export function InstallationCalculator({
  leadId,
  onDirtyChange,
}: {
  leadId: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const workspaceQuery = useInstallationWorkspace(leadId);
  const saveDraft = useInstallationSaveDraft(leadId);
  const complete = useInstallationComplete(leadId);
  const canEditPermission = canUpdateInstallationTechnical(user?.permissions);
  const [note, setNote] = useState('');
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  const workspace = workspaceQuery.data;
  const canEdit = Boolean(workspace?.canEdit && canEditPermission);
  const calculation = workspace?.calculation ?? null;
  const syncKey = calculation
    ? `${calculation.id}:${calculation.revision}`
    : workspace
      ? `workspace:${leadId}`
      : null;

  if (workspace && syncKey && syncKey !== hydratedKey) {
    setNote(calculation?.note ?? '');
    setDraftItems(
      (calculation?.items ?? []).map((item) => ({
        key: item.id,
        workTypeId: item.workTypeId ?? '',
        quantity: item.quantity,
        quantitySource: item.quantitySource,
        note: item.note ?? '',
      })),
    );
    setDirty(false);
    setHydratedKey(syncKey);
  }

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const workTypes = workspace?.workTypes ?? [];

  function markDirty(next: DraftItem[]) {
    setDraftItems(next);
    setDirty(true);
  }

  if (workspaceQuery.isLoading) {
    return (
      <section className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {t('engineering.installationLoading')}
      </section>
    );
  }

  if (workspaceQuery.isError || !workspace) {
    return (
      <section className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {t('engineering.installationLoadFailed')}
      </section>
    );
  }

  if (!workspace.applicable) {
    return (
      <section className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <h3 className="text-sm font-semibold text-slate-950">
          {t('engineering.installationTitle')}
        </h3>
        <p className="mt-2">{t('engineering.installationNotRequested')}</p>
      </section>
    );
  }

  const busy = saveDraft.isPending || complete.isPending;
  const revision = workspace.calculation?.revision;

  return (
    <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
            {t('engineering.installationTitle')}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t('engineering.installationSubtitle')}
          </p>
        </div>
        <p className="text-xs text-slate-500" role="status">
          {dirty
            ? t('engineering.installationUnsaved')
            : t('engineering.installationSaveState')}
        </p>
      </div>
      {workspace.suggestedArea.value ? (
        <p className="mt-2 text-sm text-slate-700">
          {t('engineering.installationConfirmedArea')}: {workspace.suggestedArea.value} м²
        </p>
      ) : null}
      {workspace.calculation ? (
        <p className="mt-1 text-xs text-slate-500">
          {t('engineering.installationRevision')} {workspace.calculation.revision}
          {' · '}
          {workspace.calculation.status === 'READY'
            ? t('engineering.installationStatusReady')
            : t('engineering.installationStatusDraft')}
        </p>
      ) : null}

      {workTypes.length === 0 ? (
        <p className="mt-3 text-sm text-amber-800">
          {t('engineering.installationNoCatalog')}
        </p>
      ) : null}

      <div className="mt-3 space-y-3">
        {draftItems.length === 0 ? (
          <p className="text-sm text-slate-500">{t('engineering.installationEmpty')}</p>
        ) : (
          draftItems.map((item, index) => (
            <WorkCard
              key={item.key}
              item={item}
              workTypes={workTypes}
              locale={locale}
              t={t}
              canEdit={canEdit}
              onChange={(next) => {
                const copy = [...draftItems];
                copy[index] = next;
                markDirty(copy);
              }}
              onRemove={() => markDirty(draftItems.filter((_, i) => i !== index))}
            />
          ))
        )}
      </div>

      {canEdit ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={busy || workTypes.length === 0}
            onClick={() =>
              markDirty([
                ...draftItems,
                {
                  key: `new-${Date.now()}`,
                  workTypeId: workTypes[0]?.id ?? '',
                  quantity: '',
                  quantitySource: 'MANUAL',
                  note: '',
                },
              ])
            }
          >
            {t('engineering.installationAddWork')}
          </Button>
        </div>
      ) : null}

      <label className="mt-4 block text-sm text-slate-700">
        {t('engineering.installationNotes')}
        <textarea
          className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
          rows={2}
          disabled={!canEdit || busy}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setDirty(true);
          }}
        />
      </label>

      {canEdit ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              void saveDraft
                .mutateAsync({
                  expectedRevision: revision,
                  note,
                  items: draftItems.map((item, index) => ({
                    workTypeId: item.workTypeId,
                    quantity: item.quantity || '0',
                    quantitySource: item.quantitySource,
                    note: item.note || null,
                    sortOrder: index,
                  })),
                })
                .then(() => setDirty(false));
            }}
          >
            {t('engineering.installationSaveDraft')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !workspace.calculation || draftItems.length === 0}
            onClick={() => {
              if (!revision) {
                return;
              }
              void complete.mutateAsync({ expectedRevision: revision });
            }}
          >
            {t('engineering.installationComplete')}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function WorkCard({
  item,
  workTypes,
  locale,
  t,
  canEdit,
  onChange,
  onRemove,
}: {
  item: DraftItem;
  workTypes: InstallationWorkType[];
  locale: string;
  t: (key: string) => string;
  canEdit: boolean;
  onChange: (item: DraftItem) => void;
  onRemove: () => void;
}) {
  const selected = workTypes.find((row) => row.id === item.workTypeId);
  return (
    <article className="rounded border border-slate-200 p-3 dark:border-slate-700">
      <label className="block text-sm text-slate-700">
        {t('engineering.installationWorkType')}
        <select
          className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
          disabled={!canEdit}
          value={item.workTypeId}
          onChange={(event) =>
            onChange({
              ...item,
              workTypeId: event.target.value,
              quantitySource: 'MANUAL',
            })
          }
        >
          {workTypes.map((workType) => (
            <option key={workType.id} value={workType.id}>
              {localizedName(workType, locale)} ({unitLabel(workType.unit, t as never)})
            </option>
          ))}
        </select>
      </label>
      <label className="mt-2 block text-sm text-slate-700">
        {t('engineering.installationQuantity')}
        <input
          className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
          inputMode="decimal"
          disabled={!canEdit || item.quantitySource === 'CONFIRMED_AREA'}
          value={item.quantity}
          onChange={(event) =>
            onChange({ ...item, quantity: event.target.value })
          }
        />
      </label>
      <label className="mt-2 block text-sm text-slate-700">
        {t('engineering.installationQtySource')}
        <select
          className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
          disabled={!canEdit}
          value={item.quantitySource}
          onChange={(event) =>
            onChange({
              ...item,
              quantitySource: event.target.value as InstallationQuantitySource,
            })
          }
        >
          <option value="MANUAL">{t('engineering.installationQtyManual')}</option>
          {selected?.unit === 'M2' ? (
            <option value="CONFIRMED_AREA">
              {t('engineering.installationQtyArea')}
            </option>
          ) : null}
        </select>
      </label>
      <p className="mt-1 text-xs text-slate-500">{t('engineering.installationNoNorm')}</p>
      <label className="mt-2 block text-sm text-slate-700">
        {t('engineering.installationNote')}
        <input
          className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
          disabled={!canEdit}
          value={item.note}
          onChange={(event) => onChange({ ...item, note: event.target.value })}
        />
      </label>
      {canEdit ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onRemove}
        >
          {t('engineering.installationRemove')}
        </Button>
      ) : null}
    </article>
  );
}
