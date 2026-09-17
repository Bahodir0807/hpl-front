'use client';
import { HplThicknessField } from '@/components/leads/hpl-thickness-field';
import { Button } from '@/components/ui/button';
import { SearchCombobox } from '@/components/ui/search-combobox';
import {
  PanelColor,
  PanelSize,
  PanelType,
  QualityClass,
  Supplier,
} from '@/hooks/use-panels';
import {
  applicationFromPanelTypeCode,
  formatColorLabel,
  isOtherPanelType,
  panelSizeLabel,
  panelTypeLabel,
} from '@/lib/hpl-domain';
import {
  qualityLineLabel,
} from '@/lib/quality-line-presentation';
import {
  CalculationRequestFormValues,
  CalculationRequestGroupForm,
  CalculationRequestItemErrors,
  CalculationRequestItemForm,
  createEmptyRequestGroup,
  createEmptyRequestItem,
  displayCalculationGroupTitle,
  duplicateRequestItem,
  requestItemSheetsCountDisplay,
} from '@/lib/calculation-request';
import { formatSupplierName } from '@/lib/labels';
import { useI18n } from '@/i18n/provider';
import { useLabelMaps } from '@/i18n/use-label-maps';

const inputClass =
  'w-full min-w-[7rem] rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50';

type Catalogs = {
  panelTypes: PanelType[];
  panelSizes: PanelSize[];
  qualityClasses: QualityClass[];
  panelColors: PanelColor[];
  suppliers?: Supplier[];
};

type CalculationRequestFormProps = {
  value: CalculationRequestFormValues;
  onChange: (value: CalculationRequestFormValues) => void;
  itemErrors?: Record<string, CalculationRequestItemErrors>;
  catalogs: Catalogs;
  catalogError?: string | null;
  readOnly?: boolean;
  canSubmitToHead?: boolean;
  pending?: boolean;
  submitPending?: boolean;
  onSaveDraft?: () => void;
  onSubmitToHead?: () => void;
  canEditSupplier?: boolean;
  notesReadOnly?: boolean;
  notesLabel?: string;
  saveLabel?: string;
};

function panelTypeById(types: PanelType[], id: string): PanelType | undefined {
  return types.find((item) => item.id === id);
}

function HplRequestRow({
  item,
  index,
  catalogs,
  errors,
  readOnly,
  canDelete,
  onChange,
  onDuplicate,
  onDelete,
  canEditSupplier,
}: {
  item: CalculationRequestItemForm;
  index: number;
  catalogs: Catalogs;
  errors?: CalculationRequestItemErrors;
  readOnly: boolean;
  canDelete: boolean;
  onChange: (item: CalculationRequestItemForm) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canEditSupplier: boolean;
}) {
  const { t, messages } = useI18n();
  const { supplierDisplayNames } = useLabelMaps();
  const panelType = panelTypeById(catalogs.panelTypes, item.panelTypeId);
  const application = applicationFromPanelTypeCode(panelType?.code);
  const classes = catalogs.qualityClasses;
  const showCustomType = isOtherPanelType(panelType);
  const showCustomSize = item.sizeMode === 'CUSTOM';
  const selectedSize = catalogs.panelSizes.find(
    (size) => size.id === item.panelSizeId,
  );

  const setField = <K extends keyof CalculationRequestItemForm>(
    field: K,
    fieldValue: CalculationRequestItemForm[K],
  ): void => {
    if (field === 'panelTypeId') {
      const nextType = panelTypeById(catalogs.panelTypes, String(fieldValue));
      onChange({
        ...item,
        panelTypeId: String(fieldValue),
        customTypeDescription: isOtherPanelType(nextType)
          ? item.customTypeDescription
          : '',
      });
      return;
    }

    if (field === 'requiredAreaM2' || field === 'panelSizeId') {
      onChange({
        ...item,
        [field]: fieldValue,
        sheetsCount: '',
      });
      return;
    }

    onChange({ ...item, [field]: fieldValue });
  };

  const errorText = (field: keyof CalculationRequestItemErrors): string | undefined =>
    errors?.[field];
  const errorId = (field: keyof CalculationRequestItemErrors): string | undefined =>
    errorText(field) ? `${item.key}-${field}-error` : undefined;

  return (
    <>
      <tr className={errors ? 'bg-red-50/60' : undefined}>
        <td className="px-2 py-2">
          <select
            aria-label={t('calculations.rowSupplier', { index: index + 1 })}
            aria-invalid={Boolean(errorText('supplierId'))}
            aria-describedby={errorId('supplierId')}
            className={inputClass}
            disabled={readOnly || !canEditSupplier}
            value={item.supplierId}
            onChange={(event) => setField('supplierId', event.target.value)}
          >
            <option value="">{t('common.select')}</option>
            {(catalogs.suppliers ?? []).map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {formatSupplierName(
                  supplier.code,
                  supplier.name,
                  messages.suppliers.fallback,
                  supplierDisplayNames,
                )}
              </option>
            ))}
          </select>
          {errorText('supplierId') ? (
            <p id={errorId('supplierId')} className="mt-1 text-xs text-red-600">
              {errorText('supplierId')}
            </p>
          ) : null}
        </td>
        <td className="px-2 py-2">
          <SearchCombobox
            ariaLabel={t('calculations.rowLine', { index: index + 1 })}
            value={item.qualityClassId}
            onChange={(nextValue) => setField('qualityClassId', nextValue)}
            options={classes.map((entry) => ({
              value: entry.id,
              label: qualityLineLabel(entry, messages),
              description: entry.code ?? undefined,
            }))}
            placeholder={messages.hpl.qualityLinePlaceholder}
            searchPlaceholder={t('calculations.searchLine')}
            emptyLabel={messages.hpl.qualityLinesNotFound}
            disabled={readOnly}
          />
          {errorText('qualityClassId') ? (
            <p id={errorId('qualityClassId')} className="mt-1 text-xs text-red-600">
              {errorText('qualityClassId')}
            </p>
          ) : null}
        </td>
        <td className="px-2 py-2">
          <select
            aria-label={t('calculations.rowType', { index: index + 1 })}
            aria-invalid={Boolean(errorText('panelTypeId'))}
            aria-describedby={errorId('panelTypeId')}
            className={inputClass}
            disabled={readOnly}
            value={item.panelTypeId}
            onChange={(event) => setField('panelTypeId', event.target.value)}
          >
            <option value="">{t('common.select')}</option>
            {catalogs.panelTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {panelTypeLabel(type, messages)}
              </option>
            ))}
          </select>
          {errorText('panelTypeId') ? (
            <p id={errorId('panelTypeId')} className="mt-1 text-xs text-red-600">
              {errorText('panelTypeId')}
            </p>
          ) : null}
        </td>
        <td className="px-2 py-2">
          <input
            aria-label={t('calculations.rowCoating', { index: index + 1 })}
            className={inputClass}
            disabled={readOnly}
            value={item.coating}
            onChange={(event) => setField('coating', event.target.value)}
          />
        </td>
        <td className="px-2 py-2">
          <select
            aria-label={t('calculations.rowSize', { index: index + 1 })}
            aria-invalid={Boolean(errorText('panelSizeId'))}
            aria-describedby={errorId('panelSizeId')}
            className={inputClass}
            disabled={readOnly}
            value={item.panelSizeId}
            onChange={(event) => setField('panelSizeId', event.target.value)}
          >
            <option value="">{t('common.select')}</option>
            {catalogs.panelSizes.map((size) => (
              <option key={size.id} value={size.id}>
                {panelSizeLabel(size, messages)}
              </option>
            ))}
          </select>
          {showCustomSize ? (
            <>
              <div className="mt-1 flex gap-1">
                <input
                  aria-label={t('calculations.rowWidth', { index: index + 1 })}
                  aria-invalid={Boolean(errorText('customWidthMm'))}
                  aria-describedby={errorId('customWidthMm')}
                  className={inputClass}
                  disabled={readOnly}
                  inputMode="numeric"
                  placeholder={t('calculations.width')}
                  value={item.customWidthMm}
                  onChange={(event) =>
                    setField('customWidthMm', event.target.value)
                  }
                />
                <input
                  aria-label={t('calculations.rowHeight', { index: index + 1 })}
                  aria-invalid={Boolean(errorText('customHeightMm'))}
                  aria-describedby={errorId('customHeightMm')}
                  className={inputClass}
                  disabled={readOnly}
                  inputMode="numeric"
                  placeholder={t('calculations.height')}
                  value={item.customHeightMm}
                  onChange={(event) =>
                    setField('customHeightMm', event.target.value)
                  }
                />
              </div>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                {t('calculations.customSizeHint')}
              </p>
            </>
          ) : null}
          {errorText('panelSizeId') ? (
            <p id={errorId('panelSizeId')} className="mt-1 text-xs text-red-600">
              {errorText('panelSizeId')}
            </p>
          ) : null}
          {showCustomSize &&
          (errorText('customWidthMm') || errorText('customHeightMm')) ? (
            <p
              id={errorId('customWidthMm') ?? errorId('customHeightMm')}
              className="mt-1 text-xs text-red-600"
            >
              {errorText('customWidthMm') ?? errorText('customHeightMm')}
            </p>
          ) : null}
        </td>
        <td className="px-2 py-2">
          <HplThicknessField
            compact
            disabled={readOnly}
            application={application}
            name={`thickness-${item.key}`}
            value={item.thicknessMm}
            error={errorText('thicknessMm')}
            onChange={(value) => setField('thicknessMm', value)}
          />
        </td>
        <td className="px-2 py-2">
          <input
            aria-label={t('calculations.rowArea', { index: index + 1 })}
            aria-invalid={Boolean(errorText('requiredAreaM2'))}
            aria-describedby={errorId('requiredAreaM2')}
            className={inputClass}
            disabled={readOnly}
            inputMode="decimal"
            value={item.requiredAreaM2}
            onChange={(event) => setField('requiredAreaM2', event.target.value)}
          />
          {errorText('requiredAreaM2') ? (
            <p id={errorId('requiredAreaM2')} className="mt-1 text-xs text-red-600">
              {errorText('requiredAreaM2')}
            </p>
          ) : null}
        </td>
        <td className="px-2 py-2">
          <span
            aria-label={t('calculations.rowQuantity', { index: index + 1 })}
            className="block min-w-[4.5rem] text-sm text-slate-900"
          >
            {requestItemSheetsCountDisplay(item, selectedSize, messages)}
          </span>
        </td>
        <td className="px-2 py-2">
          <input
            aria-label={t('calculations.rowDecor', { index: index + 1 })}
            className={inputClass}
            disabled={readOnly}
            placeholder={t('calculations.decorPlaceholder')}
            value={item.decor}
            onChange={(event) => setField('decor', event.target.value)}
          />
          {item.colorName.trim() || item.colorCode.trim() ? (
            <p className="mt-1 text-[11px] leading-4 text-slate-600">
              {t('calculations.customerWish', {
                value: formatColorLabel(
                  {
                    colorCode: item.colorCode,
                    colorName: item.colorName,
                  },
                  messages,
                ),
              })}
            </p>
          ) : null}
        </td>
        <td className="px-2 py-2">
          <input
            aria-label={t('calculations.rowTexture', { index: index + 1 })}
            className={inputClass}
            disabled={readOnly}
            value={item.texture}
            onChange={(event) => setField('texture', event.target.value)}
          />
        </td>
        <td className="px-2 py-2">
          <input
            aria-label={t('calculations.rowNote', { index: index + 1 })}
            className={inputClass}
            disabled={readOnly}
            value={item.note}
            onChange={(event) => setField('note', event.target.value)}
          />
        </td>
        <td className="sticky right-0 bg-white px-2 py-2">
          {readOnly ? null : (
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={t('calculations.duplicateRow', { index: index + 1 })}
                onClick={onDuplicate}
              >
                {t('common.duplicate')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                aria-label={t('calculations.deleteRow', { index: index + 1 })}
                disabled={!canDelete}
                onClick={onDelete}
              >
                {t('common.delete')}
              </Button>
            </div>
          )}
        </td>
      </tr>
      {showCustomType ? (
        <tr>
          <td colSpan={11} className="px-2 pb-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">
                {t('calculations.customTypeDescription')}
              </span>
              <input
                aria-label={t('calculations.customTypeDescription')}
                aria-invalid={Boolean(errorText('customTypeDescription'))}
                aria-describedby={errorId('customTypeDescription')}
                className={inputClass}
                disabled={readOnly}
                value={item.customTypeDescription}
                onChange={(event) =>
                  setField('customTypeDescription', event.target.value)
                }
              />
              {errorText('customTypeDescription') ? (
                <span
                  id={errorId('customTypeDescription')}
                  className="mt-1 block text-xs text-red-600"
                >
                  {errorText('customTypeDescription')}
                </span>
              ) : null}
            </label>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function CalculationGroup({
  group,
  index,
  catalogs,
  itemErrors,
  readOnly,
  canDeleteGroup,
  onChange,
  onDelete,
  canEditSupplier,
}: {
  group: CalculationRequestGroupForm;
  index: number;
  catalogs: Catalogs;
  itemErrors?: Record<string, CalculationRequestItemErrors>;
  readOnly: boolean;
  canDeleteGroup: boolean;
  onChange: (group: CalculationRequestGroupForm) => void;
  onDelete: () => void;
  canEditSupplier: boolean;
}) {
  const { t } = useI18n();
  const updateItem = (itemIndex: number, item: CalculationRequestItemForm): void => {
    onChange({
      ...group,
      items: group.items.map((current, currentIndex) =>
        currentIndex === itemIndex ? item : current,
      ),
    });
  };

  return (
    <section className="rounded border border-slate-200">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <h4 className="text-sm font-semibold text-slate-900">
          {displayCalculationGroupTitle(group.title, index, t)}
        </h4>
        {readOnly || !canDeleteGroup ? null : (
          <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
            {t('calculations.deleteCalculation')}
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1280px] w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-slate-600">
              <th className="px-2 py-2">{t('calculations.supplier')}</th>
              <th className="px-2 py-2">{t('calculations.qualityLine')}</th>
              <th className="px-2 py-2">{t('calculations.hplType')}</th>
              <th className="px-2 py-2">{t('calculations.coating')}</th>
              <th className="px-2 py-2">{t('calculations.size')}</th>
              <th className="px-2 py-2">{t('calculations.thickness')}</th>
              <th className="px-2 py-2">{t('calculations.area')}</th>
              <th className="px-2 py-2">{t('calculations.quantity')}</th>
              <th className="px-2 py-2">{t('calculations.decor')}</th>
              <th className="px-2 py-2">{t('calculations.texture')}</th>
              <th className="px-2 py-2">{t('calculations.note')}</th>
              <th className="sticky right-0 bg-slate-50 px-2 py-2">{t('calculations.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map((item, itemIndex) => (
              <HplRequestRow
                key={item.key}
                item={item}
                index={itemIndex}
                catalogs={catalogs}
                errors={itemErrors?.[item.key]}
                readOnly={readOnly}
                canDelete={group.items.length > 1}
                onChange={(next) => updateItem(itemIndex, next)}
                onDuplicate={() =>
                  onChange({
                    ...group,
                    items: [
                      ...group.items.slice(0, itemIndex + 1),
                      duplicateRequestItem(item, canEditSupplier),
                      ...group.items.slice(itemIndex + 1),
                    ],
                  })
                }
                onDelete={() =>
                  onChange({
                    ...group,
                    items: group.items.filter((_, current) => current !== itemIndex),
                  })
                }
                canEditSupplier={canEditSupplier}
              />
            ))}
          </tbody>
        </table>
      </div>
      {readOnly ? null : (
        <div className="border-t border-slate-200 px-3 py-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                ...group,
                items: [...group.items, createEmptyRequestItem()],
              })
            }
          >
            {t('calculations.addPanelButton')}
          </Button>
        </div>
      )}
    </section>
  );
}

export function CalculationRequestForm({
  value,
  onChange,
  itemErrors,
  catalogs,
  catalogError,
  readOnly = false,
  canSubmitToHead = false,
  pending = false,
  submitPending = false,
  onSaveDraft,
  onSubmitToHead,
  canEditSupplier = true,
  notesReadOnly = false,
  notesLabel,
  saveLabel,
}: CalculationRequestFormProps) {
  const { t } = useI18n();
  const busy = pending || submitPending;
  const notesDisabled = readOnly || notesReadOnly || busy;
  const resolvedNotesLabel = notesLabel ?? t('calculations.managerNote');
  const resolvedSaveLabel = saveLabel ?? t('calculations.saveDraft');

  return (
    <div className="space-y-4">
      {catalogError ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {catalogError}
        </p>
      ) : null}

      {value.calculations.map((group, index) => (
        <CalculationGroup
          key={group.key}
          group={group}
          index={index}
          catalogs={catalogs}
          itemErrors={itemErrors}
          readOnly={readOnly}
          canEditSupplier={canEditSupplier}
          canDeleteGroup={value.calculations.length > 1}
          onChange={(next) =>
            onChange({
              ...value,
              calculations: value.calculations.map((current, currentIndex) =>
                currentIndex === index ? next : current,
              ),
            })
          }
          onDelete={() =>
            onChange({
              ...value,
              calculations: value.calculations.filter(
                (_, currentIndex) => currentIndex !== index,
              ),
            })
          }
        />
      ))}

      {readOnly ? null : (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() =>
            onChange({
              ...value,
              calculations: [
                ...value.calculations,
                createEmptyRequestGroup(value.calculations.length),
              ],
            })
          }
        >
          {t('calculations.addCalculationButton')}
        </Button>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          {resolvedNotesLabel}
        </span>
        <textarea
          aria-label={resolvedNotesLabel}
          className="min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50"
          disabled={notesDisabled}
          value={value.notes}
          onChange={(event) => onChange({ ...value, notes: event.target.value })}
        />
      </label>

      {readOnly ? null : (
        <div className="flex flex-wrap gap-2">
          {onSaveDraft ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onSaveDraft}
            >
              {pending ? t('common.saving') : resolvedSaveLabel}
            </Button>
          ) : null}
          {canSubmitToHead && onSubmitToHead ? (
            <Button type="button" disabled={busy} onClick={onSubmitToHead}>
              {submitPending ? t('common.sending') : t('calculations.sendToHead')}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
