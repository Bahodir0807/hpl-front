'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  CalculationPreviewPayload,
  CreateCalculationItemPayload,
  useCalculationPreview,
  useCreateCalculation,
} from '@/hooks/use-calculations';
import {
  useCreatePanelColor,
  usePanelColors,
  usePanelSizes,
  usePanelTypes,
  useSupplierQualityClasses,
  useSuppliers,
} from '@/hooks/use-panels';
import { useConvertCalculationToQuote } from '@/hooks/use-quotes';
import { useAuth } from '@/context/auth-context';
import { formatMoney } from '@/lib/currency';
import { formatNumber } from '@/lib/format';
import { formatSupplierName } from '@/lib/labels';
import { isDirectorOrAbove, isManagerOnly } from '@/lib/role-access';
import {
  CalculationPreview,
  PanelSize,
  PanelType,
  QualityClass,
  Supplier,
} from '@/types/hpl';

const FALLBACK_THICKNESSES_MM = [6, 8, 10, 12, 16, 20];

const PANEL_TYPE_LABELS: Record<string, string> = {
  exterior: 'Экстерьер',
  interior: 'Интерьер',
  laboratory: 'Лабораторная',
};

const qualityClassLabels: Record<string, string> = {
  economy: 'Эконом',
  econom: 'Эконом',
  medium: 'Медиум',
  premium: 'Премиум',
};

const WIZARD_STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: 'Тип' },
  { step: 2, label: 'Поставщик' },
  { step: 3, label: 'Линейка' },
  { step: 4, label: 'Толщина' },
  { step: 5, label: 'Размер' },
  { step: 6, label: 'Цвет' },
  { step: 7, label: 'Площадь' },
  { step: 8, label: 'Результат' },
];

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type HplCalculatorWizardProps = {
  leadId: string;
  onClose: () => void;
  onSuccess?: () => void;
};

function panelTypeLabel(type: PanelType): string {
  return PANEL_TYPE_LABELS[type.code] ?? type.name;
}

function supplierLabel(supplier: Supplier): string {
  return formatSupplierName(supplier.code, supplier.name);
}

function toSupplierCode(supplier?: Supplier | null): string {
  const code = supplier?.code?.trim().toLowerCase() ?? '';
  if (code === 'wuya' || code === 'tianran' || code === 'polybet') {
    return code;
  }

  return '';
}

function toPanelTypeCode(type?: PanelType | null): string {
  const code = type?.code?.trim().toLowerCase() ?? '';
  if (code === 'exterior' || code === 'interior' || code === 'laboratory') {
    return code;
  }

  return '';
}

function normalizeQualityCode(value?: string | null): string {
  const raw = value?.trim().toLowerCase() ?? '';
  if (!raw) {
    return '';
  }

  if (raw.includes('premium') || raw.includes('премиум')) {
    return 'premium';
  }

  if (raw.includes('medium') || raw.includes('медиум')) {
    return 'medium';
  }

  if (raw.includes('econom') || raw.includes('эконом')) {
    return 'economy';
  }

  return raw;
}

function resolveQualityCode(item: QualityClass): string {
  const candidates = [
    item.code,
    item.slug,
    item.nameRu,
    item.displayName,
    item.name,
    item.title,
    item.label,
  ];

  for (const candidate of candidates) {
    const code = normalizeQualityCode(candidate);
    if (code && qualityClassLabels[code]) {
      return code === 'econom' ? 'economy' : code;
    }
  }

  return '';
}

function isLaboratoryOnlyTianran(
  supplierCode?: string | null,
  panelTypeCode?: string | null,
): boolean {
  return (
    panelTypeCode?.toLowerCase() === 'laboratory' &&
    supplierCode?.toLowerCase() !== 'tianran'
  );
}

function isQualityClassAllowed(
  supplierCode?: string | null,
  panelTypeCode?: string | null,
  qualityCode?: string | null,
): boolean {
  const supplier = supplierCode?.toLowerCase() ?? '';
  const panel = panelTypeCode?.toLowerCase() ?? '';
  const quality = qualityCode?.toLowerCase() ?? '';

  if (panel === 'laboratory') {
    return (
      supplier === 'tianran' &&
      (quality === 'economy' ||
        quality === 'medium' ||
        quality === 'premium')
    );
  }

  if (supplier === 'wuya') {
    return (
      (panel === 'exterior' || panel === 'interior') && quality === 'economy'
    );
  }

  if (supplier === 'polybet') {
    return (
      (panel === 'exterior' || panel === 'interior') && quality === 'premium'
    );
  }

  if (supplier === 'tianran') {
    return (
      quality === 'economy' ||
      quality === 'medium' ||
      quality === 'premium'
    );
  }

  return false;
}

function qualityClassLabel(item: QualityClass | string | null | undefined): string {
  if (typeof item === 'string' || item == null) {
    return qualityClassLabels[normalizeQualityCode(item)] ?? '';
  }

  const mapped = qualityClassLabels[resolveQualityCode(item)];
  if (mapped) {
    return mapped;
  }

  const named = [
    item.nameRu,
    item.displayName,
    item.name,
    item.title,
    item.label,
  ]
    .map((value) => value?.trim() ?? '')
    .find((value) => value && value.toLowerCase() !== 'линейка');

  return named || item.code?.trim() || '';
}

function resolveSheetArea(size: PanelSize): number | null {
  const fromSize = Number(size.areaM2);
  if (!Number.isNaN(fromSize) && fromSize > 0) {
    return fromSize;
  }

  if (size.length > 0 && size.width > 0) {
    return (size.length * size.width) / 1_000_000;
  }

  return null;
}

function formatSize(size: PanelSize): string {
  if (size.label) {
    return size.label;
  }

  return `${formatNumber(size.width)} × ${formatNumber(size.length)} мм`;
}

function OptionCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border p-4 text-left transition-colors ${
        selected
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-950 hover:border-slate-400 hover:bg-slate-50'
      }`}
    >
      <div className="text-sm font-semibold">{title}</div>
      {description ? (
        <div
          className={`mt-1 text-xs ${selected ? 'text-slate-200' : 'text-slate-600'}`}
        >
          {description}
        </div>
      ) : null}
    </button>
  );
}

function ColorInlineForm({
  supplierId,
  onCreated,
}: {
  supplierId: string;
  onCreated: (colorId: string) => void;
}) {
  const createColor = useCreatePanelColor();
  const [isOpen, setIsOpen] = useState(false);
  const [colorCode, setColorCode] = useState('');
  const [colorName, setColorName] = useState('');

  const canSubmit =
    colorCode.trim().length > 0 &&
    colorName.trim().length > 0 &&
    !createColor.isPending;

  const onSubmit = async (): Promise<void> => {
    const color = await createColor.mutateAsync({
      supplierId,
      code: colorCode.trim(),
      name: colorName.trim(),
    });

    setColorCode('');
    setColorName('');
    setIsOpen(false);
    onCreated(color.id);
  };

  if (!isOpen) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        + Добавить цвет
      </Button>
    );
  }

  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Код цвета
          </span>
          <input
            value={colorCode}
            onChange={(event) => setColorCode(event.target.value)}
            placeholder="RAL-9005"
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Название
          </span>
          <input
            value={colorName}
            onChange={(event) => setColorName(event.target.value)}
            placeholder="Чёрный"
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!canSubmit}
          onClick={() => {
            void onSubmit();
          }}
        >
          Сохранить
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          Отмена
        </Button>
      </div>
    </div>
  );
}

export function HplCalculatorWizard({
  leadId,
  onClose,
  onSuccess,
}: HplCalculatorWizardProps) {
  const { user } = useAuth();
  const hideSupplierStep = isManagerOnly(user);
  const canSeePurchasePrice = isDirectorOrAbove(user);
  const [step, setStep] = useState<WizardStep>(1);
  const [panelTypeId, setPanelTypeId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [qualityClassId, setQualityClassId] = useState('');
  const [thickness, setThickness] = useState<number | null>(null);
  const [panelSizeId, setPanelSizeId] = useState('');
  const [colorId, setColorId] = useState('');
  const [requiredAreaM2, setRequiredAreaM2] = useState('');
  const [sizeQuery, setSizeQuery] = useState('');
  const [preview, setPreview] = useState<CalculationPreview | null>(null);
  const [savedCalculationId, setSavedCalculationId] = useState<string | null>(
    null,
  );

  const typesQuery = usePanelTypes();
  const suppliersQuery = useSuppliers(!hideSupplierStep);
  const sizesQuery = usePanelSizes();
  const colorsQuery = usePanelColors(supplierId || undefined);
  const previewMutation = useCalculationPreview();
  const createCalculation = useCreateCalculation();
  const convertToQuote = useConvertCalculationToQuote();

  const panelTypes = typesQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? [];
  const sizes = sizesQuery.data ?? [];
  const colors = colorsQuery.data ?? [];

  const selectedType = panelTypes.find((item) => item.id === panelTypeId);
  const selectedSupplier = suppliers.find((item) => item.id === supplierId);
  const selectedSize = sizes.find((item) => item.id === panelSizeId);
  const selectedColor = colors.find((item) => item.id === colorId);
  const supplierCode = toSupplierCode(selectedSupplier);
  const panelTypeCode = toPanelTypeCode(selectedType);

  const qualityQuery = useSupplierQualityClasses(supplierCode, panelTypeCode);
  const qualityClasses = useMemo(() => {
    const classes = qualityQuery.data ?? [];
    const allowed = classes.filter((item) =>
      isQualityClassAllowed(
        supplierCode,
        panelTypeCode,
        resolveQualityCode(item),
      ),
    );

    return allowed.length > 0 ? allowed : classes;
  }, [panelTypeCode, qualityQuery.data, supplierCode]);

  const availableSuppliers = useMemo(
    () =>
      suppliers.filter(
        (supplier) =>
          !isLaboratoryOnlyTianran(supplier.code, selectedType?.code),
      ),
    [selectedType?.code, suppliers],
  );

  const filteredSizes = useMemo(() => {
    const query = sizeQuery.trim().toLowerCase();
    if (!query) {
      return sizes;
    }

    return sizes.filter((size) => {
      const haystack = `${size.label ?? ''} ${size.width} ${size.length} ${size.width}x${size.length}`;
      return haystack.toLowerCase().includes(query);
    });
  }, [sizeQuery, sizes]);

  useEffect(() => {
    if (step !== 3 || qualityQuery.isLoading || qualityQuery.isFetching) {
      return;
    }

    if (!qualityQuery.isSuccess) {
      return;
    }

    if (qualityClasses.length === 1 && qualityClasses[0]?.id) {
      setQualityClassId(qualityClasses[0].id);
      setStep(4);
    }
  }, [
    qualityClasses,
    qualityQuery.isFetching,
    qualityQuery.isLoading,
    qualityQuery.isSuccess,
    step,
  ]);

  useEffect(() => {
    if (!hideSupplierStep) {
      return;
    }

    if (step === 2 || step === 3) {
      setStep(4);
    }
  }, [hideSupplierStep, step]);

  const goBack = (): void => {
    if (step === 1) {
      return;
    }

    if (step === 3 && hideSupplierStep) {
      setStep(1);
      return;
    }

    if (step === 4 && (hideSupplierStep || qualityClasses.length <= 1)) {
      setStep(hideSupplierStep ? 1 : 2);
      return;
    }

    setStep((current) => (current - 1) as WizardStep);
  };

  const selectSupplier = (nextSupplier: Supplier): void => {
    if (nextSupplier.id !== supplierId) {
      setColorId('');
    }

    setQualityClassId('');
    setPreview(null);
    setSavedCalculationId(null);
    setSupplierId(nextSupplier.id);
    setStep(3);
  };

  const markDirty = (): void => {
    setPreview(null);
    setSavedCalculationId(null);
  };

  const buildPreviewPayload = (): CalculationPreviewPayload => {
    const area = Number(requiredAreaM2);

    return {
      panelTypeId,
      ...(supplierId ? { supplierId } : {}),
      qualityClassId: qualityClassId || undefined,
      thicknessMm: thickness ?? 0,
      panelSizeId,
      colorId: colorId || undefined,
      requiredAreaM2: Number.isNaN(area) ? 0 : area,
    };
  };

  const toCreateItem = (item?: {
    panelTypeId?: string;
    panelSizeId?: string;
    supplierId?: string;
    qualityClassId?: string | null;
    thickness?: number;
    thicknessMm?: number;
    colorId?: string | null;
    areaM2?: number | string;
    requiredAreaM2?: number | string;
  }): CreateCalculationItemPayload => {
    const area = item?.requiredAreaM2 ?? item?.areaM2 ?? requiredAreaM2;
    const itemColorId = item?.colorId || colorId;
    const itemSupplierId = item?.supplierId ?? supplierId;
    const itemQualityClassId = item?.qualityClassId || qualityClassId;

    return {
      panelTypeId: item?.panelTypeId ?? panelTypeId,
      panelSizeId: item?.panelSizeId ?? panelSizeId,
      ...(itemSupplierId ? { supplierId: itemSupplierId } : {}),
      ...(itemQualityClassId ? { qualityClassId: itemQualityClassId } : {}),
      thicknessMm: item?.thicknessMm ?? item?.thickness ?? thickness ?? 0,
      ...(itemColorId ? { colorId: itemColorId } : {}),
      requiredAreaM2: String(area),
    };
  };

  const buildItems = (
    result: CalculationPreview,
  ): CreateCalculationItemPayload[] => {
    if (result.items && result.items.length > 0) {
      return result.items.map((item) => toCreateItem(item));
    }

    return [toCreateItem({ areaM2: result.areaM2 })];
  };

  const runPreview = async (): Promise<void> => {
    if (hideSupplierStep) {
      const area = Number(requiredAreaM2);
      const sheet = selectedSize ? resolveSheetArea(selectedSize) : null;
      const sheetCount =
        sheet && sheet > 0 && !Number.isNaN(area)
          ? Math.ceil(area / sheet)
          : 0;
      const totalArea = sheet && sheetCount > 0 ? sheetCount * sheet : area;

      setPreview({
        sheetCount,
        areaM2: totalArea,
        purchasePricePerM2: 0,
        clientPricePerM2: 0,
        pricePerSheet: 0,
        totalAmount: 0,
      });
      setSavedCalculationId(null);
      setStep(8);
      return;
    }

    const result = await previewMutation.mutateAsync(buildPreviewPayload());
    setPreview(result);
    setSavedCalculationId(null);
    setStep(8);
  };

  const saveCalculation = async () => {
    if (!preview) {
      return null;
    }

    if (savedCalculationId) {
      return savedCalculationId;
    }

    const saved = await createCalculation.mutateAsync({
      leadId,
      items: buildItems(preview),
    });

    setSavedCalculationId(saved.id);
    return saved.id;
  };

  const onSave = async (): Promise<void> => {
    await saveCalculation();
  };

  const onCreateQuote = async (): Promise<void> => {
    const calculationId = await saveCalculation();
    if (!calculationId) {
      return;
    }

    await convertToQuote.mutateAsync({ calculationId });
    onSuccess?.();
    onClose();
  };

  const requiredArea = Number(requiredAreaM2);
  const canPreview =
    Boolean(panelTypeId) &&
    (hideSupplierStep || Boolean(supplierId)) &&
    (hideSupplierStep || Boolean(qualityClassId)) &&
    thickness !== null &&
    Boolean(panelSizeId) &&
    requiredArea > 0 &&
    !Number.isNaN(requiredArea);

  const sheetArea = selectedSize ? resolveSheetArea(selectedSize) : null;
  const isSaving = createCalculation.isPending || convertToQuote.isPending;
  const visibleSteps = hideSupplierStep
    ? WIZARD_STEPS.filter((item) => item.step !== 2)
    : WIZARD_STEPS;
  const currentVisibleIndex = Math.max(
    1,
    visibleSteps.findIndex((item) => item.step === step) + 1,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Калькулятор HPL-панелей
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Расчёт для лида · шаг {currentVisibleIndex} из {visibleSteps.length}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Закрыть
          </Button>
        </div>

        <div className="overflow-x-auto border-b border-slate-200 px-5 py-3">
          <div className="flex w-max min-w-full gap-1">
            {visibleSteps.map((item, index) => {
              const isCurrent = item.step === step;
              const isDone = item.step < step;

              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={!isDone}
                  onClick={() => {
                    if (isDone) {
                      setStep(item.step);
                    }
                  }}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    isCurrent
                      ? 'bg-slate-900 text-white'
                      : isDone
                        ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                        : 'text-slate-400'
                  }`}
                >
                  {index + 1}. {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {step === 1 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Тип панели
              </h3>
              {typesQuery.isLoading ? (
                <p className="text-sm text-slate-600">Загрузка типов...</p>
              ) : null}
              {typesQuery.isError ? (
                <p className="text-sm text-red-600">Не удалось загрузить типы панелей.</p>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {panelTypes.map((type) => (
                  <OptionCard
                    key={type.id}
                    title={panelTypeLabel(type)}
                    selected={panelTypeId === type.id}
                    onClick={() => {
                      if (type.id !== panelTypeId) {
                        setQualityClassId('');
                        if (
                          type.code === 'laboratory' &&
                          selectedSupplier &&
                          selectedSupplier.code?.toLowerCase() !== 'tianran'
                        ) {
                          setSupplierId('');
                          setColorId('');
                        }
                      }
                      setPanelTypeId(type.id);
                      markDirty();
                      setStep(hideSupplierStep ? 4 : 2);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {!hideSupplierStep && step === 2 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Поставщик
              </h3>
              {suppliersQuery.isLoading ? (
                <p className="text-sm text-slate-600">Загрузка поставщиков...</p>
              ) : null}
              {suppliersQuery.isError ? (
                <p className="text-sm text-red-600">Не удалось загрузить поставщиков.</p>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {availableSuppliers.map((supplier) => (
                  <OptionCard
                    key={supplier.id}
                    title={supplierLabel(supplier)}
                    description={
                      supplier.deliveryDays
                        ? `Срок поставки: ${supplier.deliveryDays} дн.`
                        : undefined
                    }
                    selected={supplierId === supplier.id}
                    onClick={() => selectSupplier(supplier)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Линейка
              </h3>
              {qualityQuery.isLoading || qualityQuery.isFetching ? (
                <p className="text-sm text-slate-600">Загрузка линеек...</p>
              ) : null}
              {qualityQuery.isError ? (
                <p className="text-sm text-red-600">
                  Не удалось загрузить классы качества.
                </p>
              ) : null}
              {!qualityQuery.isLoading &&
              !qualityQuery.isFetching &&
              qualityQuery.isSuccess &&
              qualityClasses.length === 0 ? (
                <p className="text-sm text-red-600">
                  Нет доступных классов
                </p>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {qualityClasses.map((item) => {
                  const code = (item.code ?? '').toLowerCase();
                  const title =
                    qualityClassLabels[code] ||
                    item.nameRu ||
                    item.name ||
                    item.code ||
                    '';

                  return (
                    <OptionCard
                      key={item.id}
                      title={title}
                      selected={qualityClassId === item.id}
                      onClick={() => {
                        setQualityClassId(item.id);
                        markDirty();
                        setStep(4);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Толщина, мм
              </h3>
              <div className="flex flex-wrap gap-2">
                {FALLBACK_THICKNESSES_MM.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setThickness(value);
                      markDirty();
                      setStep(5);
                    }}
                    className={`min-w-16 rounded border px-3 py-2 text-sm font-medium ${
                      thickness === value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {value} мм
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Размер панели
              </h3>
              <input
                value={sizeQuery}
                onChange={(event) => setSizeQuery(event.target.value)}
                placeholder="Поиск: 1220×2440"
                className="w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              {sizesQuery.isLoading ? (
                <p className="text-sm text-slate-600">Загрузка размеров...</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {filteredSizes.map((size) => (
                  <OptionCard
                    key={size.id}
                    title={formatSize(size)}
                    description={
                      resolveSheetArea(size)
                        ? `${formatNumber(resolveSheetArea(size))} м²`
                        : undefined
                    }
                    selected={panelSizeId === size.id}
                    onClick={() => {
                      setPanelSizeId(size.id);
                      markDirty();
                      setStep(6);
                    }}
                  />
                ))}
              </div>
              {!sizesQuery.isLoading && filteredSizes.length === 0 ? (
                <p className="text-sm text-slate-500">Размеры не найдены.</p>
              ) : null}
            </div>
          ) : null}

          {step === 6 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Цвет</h3>
              {colorsQuery.isLoading ? (
                <p className="text-sm text-slate-600">Загрузка цветов...</p>
              ) : null}
              <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {colors.map((color) => (
                  <OptionCard
                    key={color.id}
                    title={color.name}
                    description={color.code ?? undefined}
                    selected={colorId === color.id}
                    onClick={() => {
                      setColorId(color.id);
                      markDirty();
                    }}
                  />
                ))}
              </div>
              {supplierId ? (
                <ColorInlineForm
                  supplierId={supplierId}
                  onCreated={(nextColorId) => {
                    setColorId(nextColorId);
                    markDirty();
                  }}
                />
              ) : null}
              <div className="pt-1">
                <Button
                  type="button"
                  disabled={!hideSupplierStep && !colorId}
                  onClick={() => setStep(7)}
                >
                  Далее
                </Button>
              </div>
            </div>
          ) : null}

          {step === 7 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Нужная площадь
              </h3>
              <label className="block max-w-xs">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Площадь, м²
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={requiredAreaM2}
                  onChange={(event) => {
                    setRequiredAreaM2(event.target.value);
                    markDirty();
                  }}
                  placeholder="Например, 48.5"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </label>
              <Button
                type="button"
                disabled={!canPreview || previewMutation.isPending}
                onClick={() => {
                  void runPreview();
                }}
              >
                {previewMutation.isPending ? 'Расчёт...' : 'Рассчитать'}
              </Button>
            </div>
          ) : null}

          {step === 8 && preview ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Результат расчёта
              </h3>
              <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
                <PreviewRow
                  label="Тип / поставщик"
                  value={`${selectedType ? panelTypeLabel(selectedType) : '—'} · ${
                    selectedSupplier ? supplierLabel(selectedSupplier) : '—'
                  }`}
                />
                <PreviewRow
                  label="Размер / толщина / цвет"
                  value={`${selectedSize ? formatSize(selectedSize) : '—'} · ${thickness ?? '—'} мм · ${
                    selectedColor?.name ?? '—'
                  }`}
                />
                <PreviewRow
                  label="Количество листов"
                  value={String(preview.sheetCount)}
                />
                <PreviewRow
                  label="Площадь одного листа"
                  value={`${formatNumber(sheetArea)} м²`}
                />
                {canSeePurchasePrice ? (
                  <PreviewRow
                    label="Цена за м² (закуп)"
                    value={formatMoney(preview.purchasePricePerM2)}
                  />
                ) : null}
                <PreviewRow
                  label="Цена за м² (клиент)"
                  value={formatMoney(preview.clientPricePerM2)}
                />
                <PreviewRow
                  label="Цена за лист"
                  value={formatMoney(preview.pricePerSheet)}
                />
                <PreviewRow
                  label="Итого"
                  value={formatMoney(preview.totalAmount)}
                />
                <PreviewRow
                  label="Срок поставки"
                  value={
                    selectedSupplier?.deliveryDays
                      ? `${selectedSupplier.deliveryDays} дн.`
                      : '—'
                  }
                />
              </div>

              {savedCalculationId ? (
                <p className="text-sm text-emerald-700">Расчёт сохранён.</p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(7)}
                >
                  Пересчитать
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={() => {
                    void onSave();
                  }}
                >
                  {createCalculation.isPending
                    ? 'Сохранение...'
                    : 'Сохранить расчёт'}
                </Button>
                <Button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    void onCreateQuote();
                  }}
                >
                  {convertToQuote.isPending ? 'Создание КП...' : 'Создать КП'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {step > 1 && step < 8 ? (
          <div className="border-t border-slate-200 px-5 py-3">
            <Button type="button" variant="outline" size="sm" onClick={goBack}>
              Назад
            </Button>
          </div>
        ) : null}

        {step === 8 ? (
          <div className="border-t border-slate-200 px-5 py-3">
            <Button type="button" variant="outline" size="sm" onClick={goBack}>
              Назад
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-200 py-2 last:border-b-0">
      <span className="text-slate-600">{label}</span>
      <span className="text-right font-medium text-slate-950">{value}</span>
    </div>
  );
}
