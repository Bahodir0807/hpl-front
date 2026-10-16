'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ENGINEERING_UPDATE_TECHNICAL_PERMISSION } from '@/lib/engineering';
import { isFacadeRecalcConfirmation } from '@/lib/engineering-errors';
import { useAuth } from '@/context/auth-context';
import {
  useFacadeAddItem,
  useFacadeCalculate,
  useFacadeConfirmArea,
  useFacadeSaveAreas,
  useFacadeSaveDraft,
  useFacadeWorkspace,
  type FacadeAreaSource,
  type FacadeCalculationArea,
  type FacadeCalculationItem,
  type FacadeConfig,
  type FacadeMaterial,
} from '@/hooks/use-facade-calculation';
import { useI18n } from '@/i18n/provider';

type AreaDraft = {
  id?: string;
  label: string;
  sortOrder: number;
  hplThicknessMm: string;
  configCode: string;
  suggestedAreaM2: string;
  suggestedAreaSource: FacadeAreaSource | null;
  confirmedAreaM2: string;
};

function areaDraftsFromWorkspace(workspace: {
  calculation: {
    areas?: FacadeCalculationArea[];
  } | null;
  suggestedAreas?: Array<{
    label: string;
    hplThicknessMm: number | null;
    configCode: string | null;
    suggestedAreaM2: string | null;
    suggestedAreaSource: FacadeAreaSource | null;
  }>;
}): AreaDraft[] {
  const persisted = workspace.calculation?.areas ?? [];
  if (persisted.length) {
    return persisted.map((area, index) => ({
      ...(area.id ? { id: area.id } : {}),
      label: area.label,
      sortOrder: area.sortOrder ?? index,
      hplThicknessMm: area.hplThicknessMm ?? '',
      configCode: area.configCode,
      suggestedAreaM2: area.suggestedAreaM2 ?? '',
      suggestedAreaSource: area.suggestedAreaSource,
      confirmedAreaM2: area.confirmedAreaM2 ?? area.suggestedAreaM2 ?? '',
    }));
  }

  return (workspace.suggestedAreas ?? []).map((area, index) => ({
    label: area.label,
    sortOrder: index,
    hplThicknessMm: area.hplThicknessMm?.toString() ?? '',
    configCode: area.configCode ?? '',
    suggestedAreaM2: area.suggestedAreaM2 ?? '',
    suggestedAreaSource: area.suggestedAreaSource,
    confirmedAreaM2: area.suggestedAreaM2 ?? '',
  }));
}

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
  t: (key: 'engineering.facadeUnitM2' | 'engineering.facadeUnitPcs' | 'engineering.facadeUnitLm' | 'engineering.facadeUnitLiter') => string,
) {
  if (unit === 'M2') {
    return t('engineering.facadeUnitM2');
  }
  if (unit === 'PCS') {
    return t('engineering.facadeUnitPcs');
  }
  if (unit === 'LM') {
    return t('engineering.facadeUnitLm');
  }
  if (unit === 'LITER') {
    return t('engineering.facadeUnitLiter');
  }
  return unit;
}

function displayMaterialName(
  item: FacadeCalculationItem,
  catalog: FacadeMaterial[],
  locale: string,
) {
  const material = catalog.find((row) => row.id === item.materialId);
  if (material) {
    return localizedName(material, locale);
  }
  return item.materialName;
}

export function FacadeCalculator({
  leadId,
  onDirtyChange,
}: {
  leadId: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const remoteConfirmation = (user?.permissions ?? []).includes(
    'facade:confirm_area_remote',
  );
  const workspaceQuery = useFacadeWorkspace(
    leadId,
    true,
    remoteConfirmation,
  );
  const calculate = useFacadeCalculate(leadId);
  const saveAreas = useFacadeSaveAreas(leadId);
  const confirmArea = useFacadeConfirmArea(leadId, remoteConfirmation);
  const saveDraft = useFacadeSaveDraft(leadId);
  const addItem = useFacadeAddItem(leadId);

  const canEditPermission = (user?.permissions ?? []).includes(
    ENGINEERING_UPDATE_TECHNICAL_PERMISSION,
  );

  const [areaDrafts, setAreaDrafts] = useState<AreaDraft[]>([]);
  const [notes, setNotes] = useState('');
  const [draftItems, setDraftItems] = useState<FacadeCalculationItem[]>([]);
  const [area, setArea] = useState('');
  const [areaSource, setAreaSource] = useState<FacadeAreaSource>('ENGINEER_ENTERED');
  const [configCode, setConfigCode] = useState('');
  const [extraMaterialId, setExtraMaterialId] = useState('');
  const [extraQty, setExtraQty] = useState('');
  const [confirmRecalc, setConfirmRecalc] = useState(false);
  const [confirmThickness] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  const workspace = workspaceQuery.data;
  const calculation = workspace?.calculation ?? null;
  const canEdit = Boolean(workspace?.canEdit && canEditPermission);
  const syncKey = calculation
    ? `${calculation.id}:${calculation.revision}`
    : workspace
      ? `workspace:${leadId}`
      : null;

  if (workspace && syncKey && syncKey !== hydratedKey) {
    const drafts = areaDraftsFromWorkspace(workspace);
    if (drafts.length === 0 && calculation?.claddingAreaM2) {
      drafts.push({
        label: 'Area A',
        sortOrder: 0,
        hplThicknessMm: workspace.hplThicknessesMm?.length === 1
          ? String(workspace.hplThicknessesMm[0])
          : '',
        configCode: '',
        suggestedAreaM2: calculation.claddingAreaM2,
        suggestedAreaSource: calculation.areaSource,
        confirmedAreaM2: calculation.claddingAreaM2,
      });
    }
    setAreaDrafts(drafts);
    setArea(drafts[0]?.suggestedAreaM2 ?? '');
    setAreaSource(
      drafts[0]?.suggestedAreaSource ?? 'ENGINEER_ENTERED',
    );
    setConfigCode(drafts[0]?.configCode ?? '');
    setNotes(calculation?.notes ?? '');
    setDraftItems(calculation?.items ?? []);
    setHydratedKey(syncKey);
  }

  const dirty = useMemo(() => {
    if (!calculation) {
      return areaDrafts.length > 0 || notes.trim().length > 0;
    }
    if ((calculation.notes ?? '') !== notes) {
      return true;
    }
    if (draftItems.length !== calculation.items.length) {
      return true;
    }
    const savedAreas = calculation.areas ?? [];
    if (areaDrafts.length !== savedAreas.length) {
      return true;
    }
    if (
      areaDrafts.some((area, index) => {
        const saved = savedAreas[index];
        return (
          !saved ||
          (saved.id ?? undefined) !== area.id ||
          saved.label !== area.label ||
          saved.hplThicknessMm !== area.hplThicknessMm ||
          saved.configCode !== area.configCode ||
          (saved.suggestedAreaM2 ?? '') !== area.suggestedAreaM2 ||
          saved.suggestedAreaSource !== area.suggestedAreaSource ||
          (saved.confirmedAreaM2 ?? '') !== area.confirmedAreaM2
        );
      })
    ) {
      return true;
    }
    return draftItems.some((item, index) => {
      const original = calculation.items[index];
      return (
        item.finalQty !== original.finalQty ||
        (item.note ?? '') !== (original.note ?? '')
      );
    });
  }, [areaDrafts, notes, draftItems, calculation]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  if (workspaceQuery.isLoading) {
    return (
      <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('engineering.facadeLoading')}
        </p>
      </section>
    );
  }

  if (workspaceQuery.isError || !workspace) {
    return (
      <section className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {t('engineering.facadeLoadFailed')}
      </section>
    );
  }

  if (!workspace.applicable) {
    return (
      <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
          {t('engineering.facadeTitle')}
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {workspace.reason === 'INSTALLATION_ONLY'
            ? t('engineering.facadeInstallationOnly')
            : t('engineering.facadeNotRequested')}
        </p>
      </section>
    );
  }

  const selectedConfig = workspace.configs.find(
    (item) => item.code === areaDrafts[0]?.configCode,
  );
  const hasManual = draftItems.some((item) => item.isManual);
  const isRemoteReviewer = remoteConfirmation && !canEdit;
  const areaConfirmationDraftChanged = areaDrafts.some((draft, index) => {
    const savedArea = calculation?.areas?.[index];
    return Boolean(
      savedArea?.confirmed &&
        savedArea.confirmedAreaM2 !== draft.confirmedAreaM2,
    );
  });

  async function runCalculate(confirm = false) {
    try {
      const saved = await saveAreas.mutateAsync({
        expectedRevision: calculation?.revision ?? 1,
        areas: areaDrafts.map((area) => ({
          ...(area.id ? { id: area.id } : {}),
          label: area.label,
          sortOrder: area.sortOrder,
          hplThicknessMm: area.hplThicknessMm,
          configCode: area.configCode,
          suggestedAreaM2: area.suggestedAreaM2 || null,
          ...(area.suggestedAreaSource
            ? { suggestedAreaSource: area.suggestedAreaSource }
            : {}),
        })),
      });
      const savedAreas = saved.areas ?? [];
      if (
        savedAreas.length === 0 ||
        savedAreas.some((item) => !item.confirmed || !item.confirmedAreaM2)
      ) {
        return;
      }
      const firstArea = savedAreas[0];
      await calculate.mutateAsync({
        configCode: firstArea.configCode,
        claddingAreaM2: firstArea.confirmedAreaM2!,
        confirmRecalculate: confirm || undefined,
        expectedRevision: saved.revision,
      });
      setConfirmRecalc(false);
    } catch (error) {
      if (isFacadeRecalcConfirmation(error)) {
        setConfirmRecalc(true);
        return;
      }
    }
  }

  async function submitAreaConfirm(draft: AreaDraft, remote = false) {
    try {
      const current = remote
        ? calculation
        : await saveAreas.mutateAsync({
            expectedRevision: calculation?.revision ?? 1,
            areas: areaDrafts.map((area) => ({
              ...(area.id ? { id: area.id } : {}),
              label: area.label,
              sortOrder: area.sortOrder,
              hplThicknessMm: area.hplThicknessMm,
              configCode: area.configCode,
              suggestedAreaM2: area.suggestedAreaM2 || null,
              ...(area.suggestedAreaSource
                ? { suggestedAreaSource: area.suggestedAreaSource }
                : {}),
            })),
          });
      if (!current) {
        return;
      }
      const saved = current;
      const savedArea = (saved.areas ?? []).find(
        (candidate) => candidate.label === draft.label,
      );
      if (!savedArea?.id) {
        return;
      }
      await confirmArea.mutateAsync({
        areaId: savedArea.id,
        confirmedAreaM2: draft.confirmedAreaM2,
        expectedRevision: current.revision,
      });
    } catch {
      // Mutations report their own translated error messages.
    }
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
            {t('engineering.facadeTitle')}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {t('engineering.facadeSubtitle')}
          </p>
        </div>
        <p className="text-xs text-slate-500" role="status">
          {dirty ? t('engineering.facadeUnsaved') : t('engineering.facadeSaveState')}
        </p>
      </div>

      <div className="mt-4 space-y-3" aria-label={t('engineering.facadeAreas')}>
        {areaDrafts.map((draft, index) => {
          const thicknessOptions = [
            ...new Set(
              workspace.configs
                .filter((config) => config.isCalculable && !config.legacy)
                .map((config) => config.hplThicknessMm)
                .filter((value): value is number => value != null),
            ),
          ].sort((left, right) => left - right);
          const matchingConfigs = workspace.configs.filter(
            (config) =>
              config.isCalculable &&
              !config.legacy &&
              config.hplThicknessMm === Number(draft.hplThicknessMm),
          );
          const savedArea = (calculation?.areas ?? []).find(
            (item) => item.id === draft.id,
          );
          return (
            <article
              key={draft.id ?? `${draft.label}-${index}`}
              className="rounded border border-slate-200 p-3 dark:border-slate-700"
            >
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {draft.label || `${t('engineering.facadeArea')} ${index + 1}`}
              </h4>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-200">
                  {t('engineering.facadeAreaName')}
                  <input
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                    value={draft.label}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setAreaDrafts((current) =>
                        current.map((row, position) =>
                          position === index
                            ? { ...row, label: event.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-200">
                  {t('engineering.facadeThicknessLabel')}
                  <select
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                    value={draft.hplThicknessMm}
                    disabled={!canEdit}
                    onChange={(event) => {
                      const nextThickness = event.target.value;
                      const matching = workspace.configs.find(
                        (config) =>
                          config.isCalculable &&
                          config.hplThicknessMm === Number(nextThickness),
                      );
                      setAreaDrafts((current) =>
                        current.map((row, position) =>
                          position === index
                            ? {
                                ...row,
                                hplThicknessMm: nextThickness,
                                configCode: matching?.code ?? '',
                              }
                            : row,
                        ),
                      );
                    }}
                  >
                    <option value="">{t('engineering.facadeClarifyArea')}</option>
                    {thicknessOptions.map((thickness) => (
                      <option key={thickness} value={thickness}>
                        {thickness} mm
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-200">
                  {t('engineering.facadeConfig')}
                  <select
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                    value={draft.configCode}
                    disabled={!canEdit || matchingConfigs.length <= 1}
                    onChange={(event) =>
                      setAreaDrafts((current) =>
                        current.map((row, position) =>
                          position === index
                            ? { ...row, configCode: event.target.value }
                            : row,
                        ),
                      )
                    }
                  >
                    <option value="">{t('engineering.facadeConfig')}</option>
                    {matchingConfigs.map((config) => (
                      <option key={config.id} value={config.code}>
                        {localizedName(config, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-200">
                  {t('engineering.facadeSuggestedArea')}
                  <input
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                    inputMode="decimal"
                    value={draft.suggestedAreaM2}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setAreaDrafts((current) =>
                        current.map((row, position) =>
                          position === index
                            ? {
                                ...row,
                                suggestedAreaM2: event.target.value,
                                suggestedAreaSource: 'ENGINEER_ENTERED',
                              }
                            : row,
                        ),
                      )
                    }
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {t('engineering.facadeAreaSource')}:{' '}
                {draft.suggestedAreaSource === 'HPL_QUALIFICATION'
                  ? t('engineering.facadeAreaSourceQualification')
                  : t('engineering.facadeAreaSourceEngineer')}
                {draft.hplThicknessMm ? ` · ${draft.hplThicknessMm} mm` : ''}
                {draft.configCode
                  ? ` · ${workspace.configs.find((config) => config.code === draft.configCode)?.norms?.length ?? 0} ${t('engineering.facadeNorms')}`
                  : ''}
              </p>

              {(canEdit || isRemoteReviewer) ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="block flex-1 text-sm text-slate-700 dark:text-slate-200">
                    {t('engineering.facadeConfirmedArea')}
                    <input
                      className="mt-1 w-full rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                      inputMode="decimal"
                      value={draft.confirmedAreaM2}
                      onChange={(event) =>
                        setAreaDrafts((current) =>
                          current.map((row, position) =>
                            position === index
                              ? { ...row, confirmedAreaM2: event.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                  </label>
                  <Button
                    type="button"
                    disabled={
                      !draft.confirmedAreaM2.trim() ||
                      !draft.hplThicknessMm ||
                      !draft.configCode ||
                      (isRemoteReviewer && !draft.id) ||
                      saveAreas.isPending ||
                      confirmArea.isPending
                    }
                    onClick={() =>
                      void submitAreaConfirm(draft, remoteConfirmation)
                    }
                  >
                    {remoteConfirmation
                      ? t('engineering.facadeConfirmRemote')
                      : t('engineering.facadeConfirmSiteVisit')}
                  </Button>
                </div>
              ) : null}
              {savedArea?.confirmed ? (
                <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300" role="status">
                  {t('engineering.facadeAreaConfirmed')} · {savedArea.confirmationMethod}
                  {savedArea.confirmedByRole ? ` · ${savedArea.confirmedByRole}` : ''}
                </p>
              ) : (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  {t('engineering.facadeAreaNeedsConfirmation')}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {canEdit ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={areaDrafts.length === 0 || saveAreas.isPending}
            onClick={() =>
              void saveAreas.mutateAsync({
                expectedRevision: calculation?.revision ?? 1,
                areas: areaDrafts.map((row) => ({
                  ...(row.id ? { id: row.id } : {}),
                  label: row.label,
                  sortOrder: row.sortOrder,
                  hplThicknessMm: row.hplThicknessMm,
                  configCode: row.configCode,
                  suggestedAreaM2: row.suggestedAreaM2 || null,
                  ...(row.suggestedAreaSource
                    ? { suggestedAreaSource: row.suggestedAreaSource }
                    : {}),
                })),
              })
            }
          >
            {t('engineering.facadeSaveAreas')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setAreaDrafts((current) => [
                ...current,
                {
                  label: `Area ${current.length + 1}`,
                  sortOrder: current.length,
                  hplThicknessMm: '',
                  configCode: '',
                  suggestedAreaM2: '',
                  suggestedAreaSource: null,
                  confirmedAreaM2: '',
                },
              ])
            }
          >
            {t('engineering.facadeAddArea')}
          </Button>
        </div>
      ) : null}

      <div className="hidden">
      {workspace.suggestedArea.ambiguous ? (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          {t('engineering.facadeAreaAmbiguous')}
        </p>
      ) : null}

      {workspace.thicknessConflict ? (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          {t('engineering.facadeThicknessConflict')}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm text-slate-700 dark:text-slate-200" htmlFor="facade-area">
          {t('engineering.facadeArea')}
          <input
            id="facade-area"
            className="mt-1 w-full rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            inputMode="decimal"
            value={area}
            disabled={!canEdit}
            onChange={(event) => {
              setArea(event.target.value);
              setAreaSource('ENGINEER_ENTERED');
            }}
          />
        </label>
        <label className="block text-sm text-slate-700 dark:text-slate-200" htmlFor="facade-config">
          {t('engineering.facadeConfig')}
          <select
            id="facade-config"
            className="mt-1 w-full rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={configCode}
            disabled={!canEdit}
            onChange={(event) => setConfigCode(event.target.value)}
          >
            {configCode === '' ? (
              <option value="">{t('engineering.facadeThicknessConfirm')}</option>
            ) : null}
            {workspace.configs
              .filter((config) => config.selectable !== false)
              .map((config) => (
              <option key={config.id} value={config.code}>
                {localizedName(config, locale)}
                {config.legacy ? ` — ${t('engineering.facadeLegacy')}` : ''}
                {config.isCalculable ? '' : ` — ${t('engineering.facadeNoNorms')}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {t('engineering.facadeAreaSource')}:{' '}
        {areaSource === 'HPL_QUALIFICATION'
          ? t('engineering.facadeAreaSourceQualification')
          : t('engineering.facadeAreaSourceEngineer')}
      </p>
      </div>

      {selectedConfig?.legacy ? (
        <p className="mt-3 rounded border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
          {t('engineering.facadeLegacyHint')}
        </p>
      ) : null}

      {selectedConfig?.hplThicknessMm ? (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          {t('engineering.facadeHplThickness', { mm: String(selectedConfig.hplThicknessMm) })}
          {selectedConfig.insulationThicknessMm
            ? ` · ${t('engineering.facadeInsulationThickness', { mm: String(selectedConfig.insulationThicknessMm) })}`
            : ''}
        </p>
      ) : null}

      {calculation && selectedConfig && calculation.configCode !== selectedConfig.code ? (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          {t('engineering.facadeConfigChange')}
        </p>
      ) : null}

      {selectedConfig && !selectedConfig.isCalculable ? (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          {t('engineering.facadeUnsupported')}
        </p>
      ) : null}

      {calculation?.status === 'UNSUPPORTED' ? (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          {t('engineering.facadeUnsupportedHint')}
        </p>
      ) : null}

      {confirmThickness ? (
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p>{t('engineering.facadeThicknessConflict')}</p>
          <Button
            type="button"
            size="sm"
            className="mt-2"
            onClick={() => {
              void runCalculate(false);
            }}
          >
            {t('engineering.facadeThicknessConfirm')}
          </Button>
        </div>
      ) : null}

      {confirmRecalc ? (
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p>
            {calculation && selectedConfig && calculation.configCode !== selectedConfig.code
              ? t('engineering.facadeConfigChange')
              : t('engineering.facadeRecalcConfirmHint')}
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void runCalculate(true);
              }}
            >
              {calculation && selectedConfig && calculation.configCode !== selectedConfig.code
                ? t('engineering.facadeSwitchSystem')
                : t('engineering.facadeRecalculate')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setConfirmRecalc(false)}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            disabled={
              calculate.isPending ||
              saveAreas.isPending ||
              !calculation?.areas?.length ||
              calculation.areas.some((item) => !item.confirmed) ||
              areaConfirmationDraftChanged
            }
            onClick={() => {
              void runCalculate(false);
            }}
          >
            {t('engineering.facadeCalculate')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saveDraft.isPending || !calculation}
            onClick={() => {
              if (!calculation) {
                return;
              }
              void saveDraft.mutateAsync({
                expectedRevision: calculation.revision,
                notes,
                items: draftItems.map((item) => ({
                  id: item.id,
                  finalQty: item.finalQty,
                  note: item.note,
                })),
              });
            }}
          >
            {t('engineering.facadeSaveDraft')}
          </Button>
        </div>
      ) : null}

      {hasManual ? (
        <p className="mt-3 text-xs text-amber-800 dark:text-amber-300">
          {t('engineering.facadeHasManual')}
        </p>
      ) : null}

      <div className="mt-4 max-w-full overflow-x-auto">
        <table className="w-full min-w-0 text-left text-sm md:min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 max-md:hidden dark:border-slate-700">
              <th className="px-3 py-2 font-medium">{t('engineering.facadeAreaName')}</th>
              <th className="px-3 py-2 font-medium">{t('engineering.facadeMaterial')}</th>
              <th className="px-3 py-2 font-medium">{t('engineering.facadeUnit')}</th>
              <th className="px-3 py-2 font-medium">{t('engineering.facadeNorm')}</th>
              <th className="px-3 py-2 font-medium">
                {t('engineering.facadeCalculatedQty')}
              </th>
              <th className="px-3 py-2 font-medium">{t('engineering.facadeFinalQty')}</th>
              <th className="px-3 py-2 font-medium">{t('engineering.facadeNote')}</th>
            </tr>
          </thead>
          <tbody className="max-md:block max-md:space-y-3">
            {draftItems.map((item, index) => {
              const name = displayMaterialName(item, workspace.catalog, locale);
              const itemArea = (calculation?.areas ?? []).find(
                (area) => area.id === (item.areaId ?? null),
              );
              return (
              <tr
                key={item.id}
                className="border-b border-slate-100 max-md:block max-md:rounded max-md:border max-md:border-slate-200 max-md:p-3 dark:border-slate-800 dark:max-md:border-slate-700"
              >
                <td className="px-3 py-2 max-md:flex max-md:items-center max-md:justify-between max-md:px-0">
                  {itemArea?.label ?? t('common.dash')}
                </td>
                <td className="px-3 py-2 max-md:block max-md:px-0">
                  <p>{name}</p>
                  {item.isManual ? (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {t('engineering.facadeManual')}
                    </p>
                  ) : null}
                  {workspace.catalog.find((row) => row.id === item.materialId)
                    ?.hasPrice === false ? (
                    <p className="text-xs text-slate-400">
                      {t('engineering.facadeNoPrice')}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2 max-md:flex max-md:items-center max-md:justify-between max-md:px-0 max-md:text-sm">
                  <span className="hidden text-xs text-slate-500 max-md:inline">
                    {t('engineering.facadeUnit')}
                  </span>
                  {unitLabel(item.unit, t)}
                </td>
                <td className="px-3 py-2 max-md:flex max-md:items-center max-md:justify-between max-md:px-0">
                  <span className="hidden text-xs text-slate-500 max-md:inline">
                    {t('engineering.facadeNorm')}
                  </span>
                  {item.qtyPerM2 ?? t('common.dash')}
                </td>
                <td className="px-3 py-2 max-md:flex max-md:items-center max-md:justify-between max-md:px-0">
                  <span className="hidden text-xs text-slate-500 max-md:inline">
                    {t('engineering.facadeCalculatedQty')}
                  </span>
                  {item.calculatedQty ?? t('common.dash')}
                </td>
                <td className="px-3 py-2 max-md:block max-md:px-0">
                  <span className="mb-1 hidden text-xs text-slate-500 max-md:block">
                    {t('engineering.facadeFinalQty')}
                  </span>
                  <input
                    className="w-full rounded border border-slate-300 p-1 text-sm dark:border-slate-600 dark:bg-slate-950 md:w-28"
                    value={item.finalQty}
                    disabled={!canEdit}
                    onChange={(event) => {
                      const next = [...draftItems];
                      next[index] = {
                        ...item,
                        finalQty: event.target.value,
                        isManual: true,
                      };
                      setDraftItems(next);
                    }}
                    aria-label={`${t('engineering.facadeFinalQty')} ${name}`}
                  />
                </td>
                <td className="px-3 py-2 max-md:block max-md:px-0">
                  <span className="mb-1 hidden text-xs text-slate-500 max-md:block">
                    {t('engineering.facadeNote')}
                  </span>
                  <input
                    className="w-full rounded border border-slate-300 p-1 text-sm dark:border-slate-600 dark:bg-slate-950 md:w-40"
                    value={item.note ?? ''}
                    disabled={!canEdit}
                    onChange={(event) => {
                      const next = [...draftItems];
                      next[index] = { ...item, note: event.target.value };
                      setDraftItems(next);
                    }}
                    aria-label={`${t('engineering.facadeNote')} ${name}`}
                  />
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {draftItems.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500">
            {t('engineering.facadeEmpty')}
          </p>
        ) : null}
      </div>

      {canEdit && calculation ? (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_auto]">
          <select
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={extraMaterialId}
            onChange={(event) => setExtraMaterialId(event.target.value)}
          >
            <option value="">{t('engineering.facadeAddMaterial')}</option>
            {workspace.catalog
              .filter((material) => {
                const codes = new Set((selectedConfig?.norms ?? []).map((row) => row.code));
                return codes.size === 0 || codes.has(material.code);
              })
              .map((material) => (
              <option key={material.id} value={material.id}>
                {localizedName(material, locale)}
              </option>
            ))}
          </select>
          <input
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={extraQty}
            onChange={(event) => setExtraQty(event.target.value)}
            placeholder={t('engineering.facadeFinalQty')}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!extraMaterialId || !extraQty || addItem.isPending}
            onClick={() => {
              void addItem
                .mutateAsync({
                  materialId: extraMaterialId,
                  finalQty: extraQty,
                  expectedRevision: calculation.revision,
                })
                .then(() => {
                  setExtraMaterialId('');
                  setExtraQty('');
                });
            }}
          >
            {t('engineering.facadeAdd')}
          </Button>
        </div>
      ) : null}

      <label className="mt-4 block text-sm text-slate-700 dark:text-slate-200">
        {t('engineering.facadeNotes')}
        <textarea
          className="mt-1 w-full rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          rows={3}
          value={notes}
          disabled={!canEdit}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
    </section>
  );
}

export function configHasNorms(config: FacadeConfig | undefined) {
  return config?.isCalculable === true;
}

export function materialHasNoPrice(material: FacadeMaterial) {
  return material.hasPrice === false && material.price == null;
}
