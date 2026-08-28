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
  QUALITY_LINES_NOT_FOUND,
  QUALITY_LINE_PLACEHOLDER,
  qualityLineLabel,
} from '@/lib/quality-line-presentation';
import {
  ADD_CALCULATION_LABEL,
  ADD_HPL_ROW_LABEL,
  CUSTOM_TYPE_DESCRIPTION_LABEL,
  CUSTOM_SIZE_SNAPSHOT_HINT,
  CalculationRequestFormValues,
  CalculationRequestGroupForm,
  CalculationRequestItemErrors,
  CalculationRequestItemForm,
  SUBMIT_TO_HEAD_LABEL,
  createEmptyRequestGroup,
  createEmptyRequestItem,
  duplicateRequestItem,
  requestItemSheetsCountDisplay,
} from '@/lib/calculation-request';

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
  const panelType = panelTypeById(catalogs.panelTypes, item.panelTypeId);
  const application = applicationFromPanelTypeCode(panelType?.code);
  const classes = catalogs.qualityClasses;
  const colors = catalogs.panelColors;
  const showCustomType = isOtherPanelType(panelType);
  const showCustomSize = item.sizeMode === 'CUSTOM';
  const selectedSize = catalogs.panelSizes.find(
    (size) => size.id === item.panelSizeId,
  );
  const selectedColorInCatalog = colors.some((color) => color.id === item.colorId);

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
        {canEditSupplier ? (
          <td className="px-2 py-2">
            <select
              aria-label={`Поставщик, строка ${index + 1}`}
              className={inputClass}
              disabled={readOnly}
              value={item.supplierId}
              onChange={(event) => setField('supplierId', event.target.value)}
            >
              <option value="">Выберите</option>
              {(catalogs.suppliers ?? []).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </td>
        ) : null}
        <td className="px-2 py-2">
          <SearchCombobox
            ariaLabel={`Линейка, строка ${index + 1}`}
            value={item.qualityClassId}
            onChange={(nextValue) => setField('qualityClassId', nextValue)}
            options={classes.map((entry) => ({
              value: entry.id,
              label: qualityLineLabel(entry),
              description: entry.code ?? undefined,
            }))}
            placeholder={QUALITY_LINE_PLACEHOLDER}
            searchPlaceholder="Поиск линейки"
            emptyLabel={QUALITY_LINES_NOT_FOUND}
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
            aria-label={`Тип HPL, строка ${index + 1}`}
            aria-invalid={Boolean(errorText('panelTypeId'))}
            aria-describedby={errorId('panelTypeId')}
            className={inputClass}
            disabled={readOnly}
            value={item.panelTypeId}
            onChange={(event) => setField('panelTypeId', event.target.value)}
          >
            <option value="">Выберите</option>
            {catalogs.panelTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {panelTypeLabel(type)}
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
            aria-label={`Покрытие, строка ${index + 1}`}
            className={inputClass}
            disabled={readOnly}
            value={item.coating}
            onChange={(event) => setField('coating', event.target.value)}
          />
        </td>
        <td className="px-2 py-2">
          <select
            aria-label={`Размер, строка ${index + 1}`}
            aria-invalid={Boolean(errorText('panelSizeId'))}
            aria-describedby={errorId('panelSizeId')}
            className={inputClass}
            disabled={readOnly}
            value={item.panelSizeId}
            onChange={(event) => setField('panelSizeId', event.target.value)}
          >
            <option value="">Выберите</option>
            {catalogs.panelSizes.map((size) => (
              <option key={size.id} value={size.id}>
                {panelSizeLabel(size)}
              </option>
            ))}
          </select>
          {showCustomSize ? (
            <>
              <div className="mt-1 flex gap-1">
                <input
                  aria-label={`Ширина мм, строка ${index + 1}`}
                  aria-invalid={Boolean(errorText('customWidthMm'))}
                  aria-describedby={errorId('customWidthMm')}
                  className={inputClass}
                  disabled={readOnly}
                  inputMode="numeric"
                  placeholder="Ширина"
                  value={item.customWidthMm}
                  onChange={(event) =>
                    setField('customWidthMm', event.target.value)
                  }
                />
                <input
                  aria-label={`Высота мм, строка ${index + 1}`}
                  aria-invalid={Boolean(errorText('customHeightMm'))}
                  aria-describedby={errorId('customHeightMm')}
                  className={inputClass}
                  disabled={readOnly}
                  inputMode="numeric"
                  placeholder="Высота"
                  value={item.customHeightMm}
                  onChange={(event) =>
                    setField('customHeightMm', event.target.value)
                  }
                />
              </div>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                {CUSTOM_SIZE_SNAPSHOT_HINT}
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
            aria-label={`Объём м², строка ${index + 1}`}
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
            aria-label={`Количество, строка ${index + 1}`}
            className="block min-w-[4.5rem] text-sm text-slate-900"
          >
            {requestItemSheetsCountDisplay(item, selectedSize)}
          </span>
        </td>
        <td className="px-2 py-2">
          <select
            aria-label={`Декор, строка ${index + 1}`}
            className={inputClass}
            disabled={readOnly}
            value={item.colorId}
            onChange={(event) => {
              const nextColorId = event.target.value;
              const selected = colors.find((color) => color.id === nextColorId);
              onChange({
                ...item,
                colorId: nextColorId,
                colorName: selected?.name?.trim() ?? '',
              });
            }}
          >
            <option value="">Выберите</option>
            {colors.map((color) => (
              <option key={color.id} value={color.id}>
                {formatColorLabel({
                  colorCode: color.code,
                  colorName: color.name,
                })}
              </option>
            ))}
            {item.colorId && !selectedColorInCatalog ? (
              <option value={item.colorId}>
                {item.colorName.trim() || item.colorId}
              </option>
            ) : null}
          </select>
          {!item.colorId && (item.colorName.trim() || item.colorCode.trim()) ? (
            <p className="mt-1 text-[11px] leading-4 text-slate-600">
              Пожелание клиента:{' '}
              {formatColorLabel({
                colorCode: item.colorCode,
                colorName: item.colorName,
              })}
            </p>
          ) : null}
        </td>
        <td className="px-2 py-2">
          <input
            aria-label={`Текстура, строка ${index + 1}`}
            className={inputClass}
            disabled={readOnly}
            value={item.texture}
            onChange={(event) => setField('texture', event.target.value)}
          />
        </td>
        <td className="px-2 py-2">
          <input
            aria-label={`Примечание, строка ${index + 1}`}
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
                aria-label={`Дублировать строку ${index + 1}`}
                onClick={onDuplicate}
              >
                Дублировать
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                aria-label={`Удалить строку ${index + 1}`}
                disabled={!canDelete}
                onClick={onDelete}
              >
                Удалить
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
                {CUSTOM_TYPE_DESCRIPTION_LABEL}
              </span>
              <input
                aria-label={CUSTOM_TYPE_DESCRIPTION_LABEL}
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
          {group.title || `Расчёт №${index + 1}`}
        </h4>
        {readOnly || !canDeleteGroup ? null : (
          <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
            Удалить расчёт
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1280px] w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-slate-600">
              {canEditSupplier ? (
                <th className="px-2 py-2">Поставщик</th>
              ) : null}
              <th className="px-2 py-2">Линейка</th>
              <th className="px-2 py-2">Тип HPL</th>
              <th className="px-2 py-2">Покрытие</th>
              <th className="px-2 py-2">Размер</th>
              <th className="px-2 py-2">Толщина</th>
              <th className="px-2 py-2">Объём м²</th>
              <th className="px-2 py-2">Кол-во</th>
              <th className="px-2 py-2">Декор</th>
              <th className="px-2 py-2">Текстура</th>
              <th className="px-2 py-2">Примечание</th>
              <th className="sticky right-0 bg-slate-50 px-2 py-2">Действия</th>
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
            {ADD_HPL_ROW_LABEL}
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
  canEditSupplier = false,
  saveLabel = 'Сохранить черновик',
}: CalculationRequestFormProps) {
  const busy = pending || submitPending;

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
          {ADD_CALCULATION_LABEL}
        </Button>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Примечание / пожелания клиента
        </span>
        <textarea
          aria-label="Примечание / пожелания клиента"
          className="min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50"
          disabled={readOnly || busy}
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
              {pending ? 'Сохранение...' : saveLabel}
            </Button>
          ) : null}
          {canSubmitToHead && onSubmitToHead ? (
            <Button type="button" disabled={busy} onClick={onSubmitToHead}>
              {submitPending ? 'Отправка...' : SUBMIT_TO_HEAD_LABEL}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
