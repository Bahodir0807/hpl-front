'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HplThicknessField } from '@/components/leads/hpl-thickness-field';
import {
  CalculationPreviewPayload,
  CreateCalculationItemPayload,
  useCalculationPreview,
  useCreateCalculation,
  useFinalizeCalculation,
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
import { getErrorMessage } from '@/lib/errors';
import { formatDate, formatNumber } from '@/lib/format';
import { PRICING_NOT_CONFIGURED_MESSAGE } from '@/lib/hpl-errors';
import {
  STANDARD_DISCRETE_THICKNESSES_MM,
  applicationFromPanelTypeCode,
  CUSTOM_SIZE_PRICING_NOTE,
  findPanelTypeIdByApplication,
  formatAreaM2,
  formatColorLabel,
  formatQualificationSize,
  formatThicknessMm,
  hplApplicationLabel,
  isStandardPanelTypeCode,
  isValidThicknessForApplication,
  normalizePanelTypeCode,
  panelSizeLabel,
  panelTypeLabel,
  resolveSheetAreaM2,
  toDecimalNumber,
  type SizeMode,
} from '@/lib/hpl-domain';
import {
  buildCalculationSizeFields,
  canSubmitCalculationGeometry,
  prefillCalculatorFromQualification,
  type CalculatorPrefillSource,
} from '@/lib/hpl-calculator';
import {
  COMMERCIAL_CALCULATION_WAITING_COPY,
  HPL_SELLING_COEFFICIENT,
  PURCHASE_PRICE_LABEL,
  canEnterManualPurchasePrice,
  canRunCommercialCalculation,
  formatCnyUsdRateLabel,
  validateManualPurchasePriceCny,
} from '@/lib/calculation-presentation';
import {
  COMMERCIAL_TERMS_SECTION_LABEL,
  CONVERT_TO_QUOTE_LABEL,
  DOCUMENT_DATE_LABEL,
  DELIVERY_PERIOD_LABEL,
  PRODUCTION_PERIOD_LABEL,
  VALID_UNTIL_LABEL,
  buildQuoteCommercialTermsPayload,
  defaultQuoteValidUntilInput,
  validateQuoteCommercialTerms,
} from '@/lib/quote-commercial-terms';
import { useCurrentCurrencyRate } from '@/hooks/use-currency-rates';
import { formatSupplierName } from '@/lib/labels';
import { QUALITY_LINES_EMPTY_MESSAGE, qualityLineLabel } from '@/lib/quality-line-presentation';
import {
  CalculationPreview,
  PanelColor,
  PanelSize,
  PanelType,
  Supplier,
} from '@/types/hpl';

type GeometryEstimate = {
  sheetsCount: number | null;
  areaM2: number;
};

type SavedCalculationRef = {
  id: string;
  status?: 'draft' | 'finalized';
};

const EMPTY_COLORS: PanelColor[] = [];

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
  qualification?: CalculatorPrefillSource | null;
  commercialSupplierId?: string | null;
  commercialQualityClassId?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
};

function supplierLabel(supplier: Supplier): string {
  return formatSupplierName(supplier.code, supplier.name);
}

function toSupplierCode(supplier?: Supplier | null): string {
  return supplier?.code?.trim().toLowerCase() ?? '';
}

function toPanelTypeCode(type?: PanelType | null): string {
  return normalizePanelTypeCode(type?.code) ?? type?.code?.trim() ?? '';
}

function hasMoneyAmount(
  value: number | string | null | undefined,
): boolean {
  return value !== undefined && value !== null && value !== '';
}

function resolveSheetArea(size?: PanelSize | null): number | null {
  return resolveSheetAreaM2(size);
}

function formatSize(size?: PanelSize | null): string {
  return panelSizeLabel(size);
}

function resolveCustomSheetArea(
  widthMm: unknown,
  heightMm: unknown,
): number | null {
  const width = toDecimalNumber(widthMm);
  const height = toDecimalNumber(heightMm);
  if (width !== null && height !== null && width > 0 && height > 0) {
    return (width * height) / 1_000_000;
  }

  return null;
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
  qualification,
  commercialSupplierId,
  commercialQualityClassId,
  onClose,
  onSuccess,
}: HplCalculatorWizardProps) {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const canRunCalculation = canRunCommercialCalculation(permissions);
  const canEnterPurchasePrice = canEnterManualPurchasePrice(permissions);
  const currentRateQuery = useCurrentCurrencyRate(canEnterPurchasePrice);
  const prefill = prefillCalculatorFromQualification(qualification);
  const [step, setStep] = useState<WizardStep>(1);
  const [panelTypeId, setPanelTypeId] = useState(prefill.panelTypeId);
  const [supplierId, setSupplierId] = useState(commercialSupplierId ?? '');
  const [qualityClassId, setQualityClassId] = useState(
    commercialQualityClassId ?? '',
  );
  const [thickness, setThickness] = useState<number | null>(prefill.thicknessMm);
  const [sizeMode, setSizeMode] = useState<SizeMode>(prefill.sizeMode);
  const [panelSizeId, setPanelSizeId] = useState(prefill.panelSizeId);
  const [customWidthMm, setCustomWidthMm] = useState(prefill.customWidthMm);
  const [customHeightMm, setCustomHeightMm] = useState(prefill.customHeightMm);
  const [colorId, setColorId] = useState('');
  const [requiredAreaM2, setRequiredAreaM2] = useState(prefill.requiredAreaM2);
  const [sizeQuery, setSizeQuery] = useState('');
  const [preview, setPreview] = useState<CalculationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [unpricedEstimate, setUnpricedEstimate] =
    useState<GeometryEstimate | null>(null);
  const [savedCalculation, setSavedCalculation] =
    useState<SavedCalculationRef | null>(null);
  const [purchasePriceCny, setPurchasePriceCny] = useState('');
  const [purchasePriceError, setPurchasePriceError] = useState<string | null>(
    null,
  );
  const [productionDaysFrom, setProductionDaysFrom] = useState('');
  const [productionDaysTo, setProductionDaysTo] = useState('');
  const [deliveryDaysFrom, setDeliveryDaysFrom] = useState('');
  const [deliveryDaysTo, setDeliveryDaysTo] = useState('');
  const [validUntil, setValidUntil] = useState(defaultQuoteValidUntilInput);
  const [commercialTermsError, setCommercialTermsError] = useState<string | null>(
    null,
  );

  const typesQuery = usePanelTypes();
  const suppliersQuery = useSuppliers();
  const sizesQuery = usePanelSizes();
  const colorsQuery = usePanelColors(supplierId || undefined);
  const previewMutation = useCalculationPreview();
  const createCalculation = useCreateCalculation();
  const finalizeCalculation = useFinalizeCalculation();
  const convertToQuote = useConvertCalculationToQuote();

  const panelTypes = (typesQuery.data ?? []).filter((type) =>
    isStandardPanelTypeCode(type.code),
  );
  const suppliers = suppliersQuery.data ?? [];
  const sizes = sizesQuery.data ?? [];
  const colors = colorsQuery.data ?? EMPTY_COLORS;
  const resolvedPanelTypeId =
    panelTypeId ||
    findPanelTypeIdByApplication(panelTypes, prefill.application) ||
    '';
  const matchedColorId =
    colors.find(
      (color) =>
        (prefill.colorCode && color.code === prefill.colorCode) ||
        (prefill.colorName && color.name === prefill.colorName),
    )?.id ?? '';
  const resolvedColorId = colorId || matchedColorId;

  const selectedType = panelTypes.find((item) => item.id === resolvedPanelTypeId);
  const selectedSupplier = suppliers.find((item) => item.id === supplierId);
  const selectedSize = sizes.find((item) => item.id === panelSizeId);
  const selectedColor = colors.find((item) => item.id === resolvedColorId);
  const supplierCode = toSupplierCode(selectedSupplier);
  const panelTypeCode = toPanelTypeCode(selectedType);
  const selectedApplication = applicationFromPanelTypeCode(selectedType?.code);

  const qualityQuery = useSupplierQualityClasses(supplierCode, panelTypeCode);
  const qualityClasses = qualityQuery.data ?? [];

  const availableSuppliers = suppliers;

  const filteredSizes = (() => {
    const query = sizeQuery.trim().toLowerCase();
    if (!query) {
      return sizes;
    }

    return sizes.filter((size) => {
      const haystack = `${panelSizeLabel(size)} ${size.widthMm} ${size.heightMm} ${size.widthMm}x${size.heightMm}`;
      return haystack.toLowerCase().includes(query);
    });
  })();
  const soleQualityClassId =
    qualityQuery.isSuccess && qualityClasses.length === 1
      ? (qualityClasses[0]?.id ?? '')
      : '';
  const selectedQualityClassId = qualityClassId || soleQualityClassId;
  const currentStep =
    step === 3 &&
    Boolean(soleQualityClassId) &&
    !qualityQuery.isLoading &&
    !qualityQuery.isFetching
      ? 4
      : step;

  const goBack = (): void => {
    if (currentStep === 1) {
      return;
    }

    if (currentStep === 3) {
      setStep(2);
      return;
    }

    if (currentStep === 4 && qualityClasses.length <= 1) {
      setStep(2);
      return;
    }

    setStep((currentStep - 1) as WizardStep);
  };

  const selectSupplier = (nextSupplier: Supplier): void => {
    if (nextSupplier.id !== supplierId) {
      setColorId('');
    }

    setQualityClassId('');
    markDirty();
    setSupplierId(nextSupplier.id);
    setStep(3);
  };

  const markDirty = (): void => {
    setPreview(null);
    setPreviewError(null);
    setUnpricedEstimate(null);
    setSavedCalculation(null);
    setPurchasePriceError(null);
  };

  const selectedQuality = qualityClasses.find(
    (item) => item.id === selectedQualityClassId,
  );

  const hasCatalogPricingInputs = Boolean(
    supplierId && selectedQualityClassId,
  );
  const canRequestPricedPreview = hasCatalogPricingInputs;

  const sizeFields = buildCalculationSizeFields({
    sizeMode,
    panelSizeId,
    customWidthMm,
    customHeightMm,
  });

  const buildPreviewPayload = (
    purchasePricePerM2Cny?: string,
  ): CalculationPreviewPayload => {
    const area = toDecimalNumber(requiredAreaM2);

    return {
      leadId,
      panelTypeId: resolvedPanelTypeId,
      ...(supplierId ? { supplierId } : {}),
      ...(selectedQualityClassId
        ? { qualityClassId: selectedQualityClassId }
        : {}),
      thicknessMm: thickness ?? 0,
      ...sizeFields,
      ...(resolvedColorId ? { colorId: resolvedColorId } : {}),
      requiredAreaM2: area ?? 0,
      ...(purchasePricePerM2Cny
        ? { purchasePricePerM2Cny }
        : {}),
    };
  };

  const buildCreateItems = (): CreateCalculationItemPayload[] => {
    const trimmedPrice = purchasePriceCny.trim().replace(',', '.');

    return [
      {
        panelTypeId: resolvedPanelTypeId,
        ...sizeFields,
        ...(supplierId ? { supplierId } : {}),
        ...(selectedQualityClassId
          ? { qualityClassId: selectedQualityClassId }
          : {}),
        thicknessMm: thickness ?? 0,
        ...(resolvedColorId ? { colorId: resolvedColorId } : {}),
        requiredAreaM2: String(requiredAreaM2),
        ...(canEnterPurchasePrice && trimmedPrice
          ? { purchasePricePerM2Cny: trimmedPrice }
          : {}),
      },
    ];
  };

  const buildGeometryEstimate = (): GeometryEstimate => {
    const area = toDecimalNumber(requiredAreaM2) ?? 0;
    const sheet =
      sizeMode === 'CUSTOM'
        ? resolveCustomSheetArea(customWidthMm, customHeightMm)
        : selectedSize
          ? resolveSheetArea(selectedSize)
          : null;
    const sheetsCount =
      sheet && sheet > 0 && area > 0 ? Math.ceil(area / sheet) : null;
    const totalArea =
      sheet && sheetsCount && sheetsCount > 0 ? sheetsCount * sheet : area;

    return {
      sheetsCount,
      areaM2: totalArea,
    };
  };

  const applyPreviewResult = (result: CalculationPreview): void => {
    if (
      hasMoneyAmount(result.total) &&
      hasMoneyAmount(result.clientPricePerM2)
    ) {
      setPreview(result);
      setUnpricedEstimate(null);
      return;
    }

    setPreview(null);
    setUnpricedEstimate({
      sheetsCount: result.sheetsCount,
      areaM2: toDecimalNumber(result.areaM2) ?? 0,
    });
  };

  const runPreview = async (): Promise<void> => {
    if (!canRequestPricedPreview) {
      setPreview(null);
      setUnpricedEstimate(buildGeometryEstimate());
      setSavedCalculation(null);
      setStep(8);
      return;
    }

    try {
      const result = await previewMutation.mutateAsync(buildPreviewPayload());
      setPreviewError(null);
      setSavedCalculation(null);
      applyPreviewResult(result);
      setStep(8);
    } catch (error) {
      const message = getErrorMessage(error);
      setPreview(null);
      setUnpricedEstimate(buildGeometryEstimate());
      setPreviewError(
        canEnterPurchasePrice && message === PRICING_NOT_CONFIGURED_MESSAGE
          ? null
          : message,
      );
      setStep(8);
    }
  };

  const runPricedCalculation = async (): Promise<void> => {
    const error = validateManualPurchasePriceCny(purchasePriceCny);
    if (error) {
      setPurchasePriceError(error);
      return;
    }

    setPurchasePriceError(null);
    try {
      const result = await previewMutation.mutateAsync(
        buildPreviewPayload(purchasePriceCny.trim().replace(',', '.')),
      );
      setPreviewError(null);
      setSavedCalculation(null);
      applyPreviewResult(result);
    } catch {
      // mutation onError already toasted
    }
  };

  const saveCalculation = async (): Promise<SavedCalculationRef | null> => {
    if (!preview) {
      return null;
    }

    if (savedCalculation) {
      return savedCalculation;
    }

    const saved = await createCalculation.mutateAsync({
      leadId,
      items: buildCreateItems(),
    });

    const nextSaved: SavedCalculationRef = {
      id: saved.id,
      status: saved.status ?? 'draft',
    };
    setSavedCalculation(nextSaved);
    return nextSaved;
  };

  const onSave = async (): Promise<void> => {
    try {
      await saveCalculation();
    } catch {
      // mutation onError already toasted
    }
  };

  const onCreateQuote = async (): Promise<void> => {
    const termsError = validateQuoteCommercialTerms({
      productionDaysFrom,
      productionDaysTo,
      deliveryDaysFrom,
      deliveryDaysTo,
      validUntil,
    });
    if (termsError) {
      setCommercialTermsError(termsError);
      return;
    }

    setCommercialTermsError(null);
    try {
      const calculation = await saveCalculation();
      if (!calculation) {
        return;
      }

      let status = calculation.status;
      if (status !== 'finalized') {
        const finalized = await finalizeCalculation.mutateAsync(
          calculation.id,
        );
        status = finalized.status ?? 'finalized';
        setSavedCalculation({
          id: calculation.id,
          status,
        });
      }

      await convertToQuote.mutateAsync({
        calculationId: calculation.id,
        ...buildQuoteCommercialTermsPayload({
          productionDaysFrom,
          productionDaysTo,
          deliveryDaysFrom,
          deliveryDaysTo,
          validUntil,
        }),
      });
      onSuccess?.();
      onClose();
    } catch {
      // mutation onError already toasted
    }
  };

  const canCalculate = canSubmitCalculationGeometry({
    panelTypeId: resolvedPanelTypeId,
    application: selectedApplication,
    thicknessMm: thickness,
    sizeMode,
    panelSizeId,
    customWidthMm,
    customHeightMm,
    requiredAreaM2,
  });
  const sheetArea =
    sizeMode === 'CUSTOM'
      ? resolveCustomSheetArea(customWidthMm, customHeightMm)
      : selectedSize
        ? resolveSheetArea(selectedSize)
        : null;
  const isSaving =
    createCalculation.isPending ||
    finalizeCalculation.isPending ||
    convertToQuote.isPending;
  const resultSheetsCount = preview?.sheetsCount ?? unpricedEstimate?.sheetsCount;
  const coveredAreaM2 =
    sheetArea != null && resultSheetsCount
      ? sheetArea * resultSheetsCount
      : toDecimalNumber(unpricedEstimate?.areaM2);
  const activeFxRate = preview?.cnyUsdRate ?? currentRateQuery.data?.rate;
  const sellingCoefficient =
    toDecimalNumber(preview?.sellingCoefficient) ?? HPL_SELLING_COEFFICIENT;
  const snapshotPurchaseCny =
    preview?.purchasePricePerM2Cny ?? preview?.supplierPricePerM2;
  const snapshotClientUsd = preview?.clientPricePerM2;
  const snapshotConvertedUsd =
    hasMoneyAmount(snapshotClientUsd) && sellingCoefficient
      ? Number(snapshotClientUsd) / sellingCoefficient
      : null;
  const visibleSteps = WIZARD_STEPS;
  const currentVisibleIndex = Math.max(
    1,
    visibleSteps.findIndex((item) => item.step === currentStep) + 1,
  );

  if (!canRunCalculation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
        <div className="w-full max-w-lg rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">
            Калькулятор HPL-панелей
          </h2>
          <p className="mt-3 text-sm text-slate-700">
            {COMMERCIAL_CALCULATION_WAITING_COPY}
          </p>
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

        <Stage1ReadOnlyContext qualification={qualification} />

        <div className="overflow-x-auto border-b border-slate-200 px-5 py-3">
          <div className="flex w-max min-w-full gap-1">
            {visibleSteps.map((item, index) => {
              const isCurrent = item.step === currentStep;
              const isDone = item.step < currentStep;

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
          {currentStep === 1 ? (
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {panelTypes.map((type) => (
                  <OptionCard
                    key={type.id}
                    title={panelTypeLabel(type)}
                    selected={resolvedPanelTypeId === type.id}
                    onClick={() => {
                      if (type.id !== resolvedPanelTypeId) {
                        setQualityClassId('');
                        const nextApplication = applicationFromPanelTypeCode(
                          type.code,
                        );
                        if (
                          !isValidThicknessForApplication(
                            nextApplication,
                            thickness,
                          )
                        ) {
                          setThickness(null);
                        }
                      }
                      setPanelTypeId(type.id);
                      markDirty();
                      setStep(2);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
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

          {currentStep === 3 ? (
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
                <p className="text-sm text-amber-700">
                  {QUALITY_LINES_EMPTY_MESSAGE}
                </p>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {qualityClasses.map((item) => {
                  return (
                    <OptionCard
                      key={item.id}
                      title={qualityLineLabel(item)}
                      selected={selectedQualityClassId === item.id}
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

          {currentStep === 4 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Толщина, мм
              </h3>
              {selectedApplication === 'FURNITURE' ? (
                <>
                  <HplThicknessField
                    application={selectedApplication}
                    value={thickness}
                    onChange={(nextValue) => {
                      setThickness(toDecimalNumber(nextValue));
                      markDirty();
                    }}
                  />
                  <Button
                    type="button"
                    disabled={
                      !isValidThicknessForApplication(
                        selectedApplication,
                        thickness,
                      )
                    }
                    onClick={() => setStep(5)}
                  >
                    Далее
                  </Button>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {STANDARD_DISCRETE_THICKNESSES_MM.map((value) => (
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
              )}
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Размер панели
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSizeMode('STANDARD');
                    setCustomWidthMm('');
                    setCustomHeightMm('');
                    markDirty();
                  }}
                  className={`rounded border px-3 py-2 text-sm font-medium ${
                    sizeMode === 'STANDARD'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Стандартный размер
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSizeMode('CUSTOM');
                    setPanelSizeId('');
                    markDirty();
                  }}
                  className={`rounded border px-3 py-2 text-sm font-medium ${
                    sizeMode === 'CUSTOM'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Нестандартный размер
                </button>
              </div>
              {sizeMode === 'STANDARD' ? (
                <>
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
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Ширина, мм
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={customWidthMm}
                        onChange={(event) => {
                          setCustomWidthMm(event.target.value);
                          markDirty();
                        }}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Высота, мм
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={customHeightMm}
                        onChange={(event) => {
                          setCustomHeightMm(event.target.value);
                          markDirty();
                        }}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      />
                    </label>
                  </div>
                  <p className="text-sm text-amber-700">{CUSTOM_SIZE_PRICING_NOTE}</p>
                  <Button
                    type="button"
                    disabled={
                      (toDecimalNumber(customWidthMm) ?? 0) <= 0 ||
                      (toDecimalNumber(customHeightMm) ?? 0) <= 0
                    }
                    onClick={() => setStep(6)}
                  >
                    Далее
                  </Button>
                </div>
              )}
            </div>
          ) : null}

          {currentStep === 6 ? (
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
                    selected={resolvedColorId === color.id}
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
                  disabled={!resolvedColorId}
                  onClick={() => setStep(7)}
                >
                  Далее
                </Button>
              </div>
            </div>
          ) : null}

          {currentStep === 7 ? (
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
                disabled={!canCalculate || previewMutation.isPending}
                onClick={() => {
                  void runPreview();
                }}
              >
                {previewMutation.isPending ? 'Расчёт...' : 'Рассчитать'}
              </Button>
            </div>
          ) : null}

          {currentStep === 8 && (preview || unpricedEstimate || previewError || canEnterPurchasePrice) ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Результат расчёта
              </h3>
              {previewError ? (
                <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {previewError}
                </p>
              ) : null}
              {!preview &&
              !previewError &&
              unpricedEstimate &&
              !canEnterPurchasePrice ? (
                <p className="text-sm text-slate-600">
                  Коммерческая цена недоступна: не заданы поставщик и класс
                  качества. Показана оценка количества листов.
                </p>
              ) : null}
              <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
                <PreviewRow
                  label="Тип"
                  value={selectedType ? panelTypeLabel(selectedType) : '—'}
                />
                <PreviewRow
                  label="Поставщик"
                  value={selectedSupplier ? supplierLabel(selectedSupplier) : '—'}
                />
                <PreviewRow
                  label="Линейка"
                  value={
                    selectedQuality ? qualityLineLabel(selectedQuality) : '—'
                  }
                />
                <PreviewRow
                  label="Размер"
                  value={
                    sizeMode === 'CUSTOM'
                      ? `Нестандартный: ${customWidthMm} × ${customHeightMm} мм`
                      : selectedSize
                        ? formatSize(selectedSize)
                        : '—'
                  }
                />
                <PreviewRow
                  label="Толщина"
                  value={`${thickness ?? '—'} мм`}
                />
                <PreviewRow
                  label="Цвет"
                  value={
                    selectedColor?.name ??
                    prefill.colorName ??
                    prefill.colorCode ??
                    '—'
                  }
                />
                <PreviewRow
                  label="Запрошенная площадь"
                  value={`${formatNumber(requiredAreaM2)} м²`}
                />
                <PreviewRow
                  label="Количество листов"
                  value={formatNumber(resultSheetsCount)}
                />
                <PreviewRow
                  label="Площадь одного листа"
                  value={`${formatNumber(sheetArea)} м²`}
                />
                <PreviewRow
                  label="Покрываемая площадь"
                  value={`${formatNumber(coveredAreaM2)} м²`}
                />
              </div>

              {canEnterPurchasePrice ? (
                <div className="space-y-3 rounded border border-slate-200 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">
                    {COMMERCIAL_TERMS_SECTION_LABEL}
                  </h4>
                  <label className="block max-w-xs">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      {PURCHASE_PRICE_LABEL}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={purchasePriceCny}
                      aria-label={PURCHASE_PRICE_LABEL}
                      onChange={(event) => {
                        setPurchasePriceCny(event.target.value);
                        setPurchasePriceError(null);
                        setPreview(null);
                        setSavedCalculation(null);
                      }}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                    {purchasePriceError ? (
                      <span className="mt-1 block text-sm text-red-600">
                        {purchasePriceError}
                      </span>
                    ) : null}
                  </label>
                  <PreviewRow
                    label="Курс"
                    value={formatCnyUsdRateLabel(activeFxRate)}
                  />
                  <PreviewRow
                    label="Коэффициент"
                    value={Number(sellingCoefficient).toFixed(1)}
                  />
                  <DayRangeFields
                    label={PRODUCTION_PERIOD_LABEL}
                    from={productionDaysFrom}
                    to={productionDaysTo}
                    onFromChange={(value) => {
                      setProductionDaysFrom(value);
                      setCommercialTermsError(null);
                    }}
                    onToChange={(value) => {
                      setProductionDaysTo(value);
                      setCommercialTermsError(null);
                    }}
                  />
                  <DayRangeFields
                    label={DELIVERY_PERIOD_LABEL}
                    from={deliveryDaysFrom}
                    to={deliveryDaysTo}
                    onFromChange={(value) => {
                      setDeliveryDaysFrom(value);
                      setCommercialTermsError(null);
                    }}
                    onToChange={(value) => {
                      setDeliveryDaysTo(value);
                      setCommercialTermsError(null);
                    }}
                  />
                  <label className="block max-w-xs">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      {VALID_UNTIL_LABEL}
                    </span>
                    <input
                      type="date"
                      value={validUntil}
                      aria-label={VALID_UNTIL_LABEL}
                      onChange={(event) => {
                        setValidUntil(event.target.value);
                        setCommercialTermsError(null);
                      }}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </label>
                  <PreviewRow
                    label={DOCUMENT_DATE_LABEL}
                    value={formatDate(new Date())}
                  />
                  {commercialTermsError ? (
                    <p className="text-sm text-red-600">{commercialTermsError}</p>
                  ) : null}
                  <Button
                    type="button"
                    disabled={previewMutation.isPending}
                    onClick={() => {
                      void runPricedCalculation();
                    }}
                  >
                    {previewMutation.isPending
                      ? 'Расчёт...'
                      : 'Рассчитать стоимость'}
                  </Button>
                </div>
              ) : null}

              {preview ? (
                <div className="rounded border border-slate-200 bg-white p-4 text-sm">
                  <PreviewRow
                    label="Цена после конвертации"
                    value={`${formatNumber(snapshotPurchaseCny)} × ${
                      activeFxRate ?? '—'
                    } = ${formatNumber(snapshotConvertedUsd)} USD/м²`}
                  />
                  <PreviewRow
                    label="Цена продажи"
                    value={`${formatNumber(snapshotConvertedUsd)} × ${Number(
                      sellingCoefficient,
                    ).toFixed(1)} = ${formatNumber(snapshotClientUsd)} USD/м²`}
                  />
                  <PreviewRow
                    label="Итого"
                    value={formatMoney(preview.total, 'USD')}
                  />
                </div>
              ) : null}

              {savedCalculation ? (
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
                  disabled={isSaving || !preview}
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
                  disabled={isSaving || !preview}
                  onClick={() => {
                    void onCreateQuote();
                  }}
                >
                  {finalizeCalculation.isPending || convertToQuote.isPending
                    ? 'Создание КП...'
                    : CONVERT_TO_QUOTE_LABEL}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {currentStep > 1 && currentStep < 8 ? (
          <div className="border-t border-slate-200 px-5 py-3">
            <Button type="button" variant="outline" size="sm" onClick={goBack}>
              Назад
            </Button>
          </div>
        ) : null}

        {currentStep === 8 ? (
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

function DayRangeFields({
  label,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  label: string;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  return (
    <div className="max-w-md">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          step="1"
          value={from}
          aria-label={`${label} от`}
          onChange={(event) => onFromChange(event.target.value)}
          className="w-20 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <span className="text-slate-500">—</span>
        <input
          type="number"
          min="1"
          step="1"
          value={to}
          aria-label={`${label} до`}
          onChange={(event) => onToChange(event.target.value)}
          className="w-20 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <span className="text-sm text-slate-600">дней</span>
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

function installationRequiredLabel(value?: boolean | null): string {
  if (value === true) {
    return 'Да';
  }

  if (value === false) {
    return 'Нет';
  }

  return 'Не указано';
}

function Stage1ReadOnlyContext({
  qualification,
}: {
  qualification?: CalculatorPrefillSource | null;
}) {
  if (!qualification) {
    return null;
  }

  const fields = [
    {
      label: 'Тип HPL',
      value: hplApplicationLabel(qualification.application),
    },
    {
      label: 'Тип панели',
      value: panelTypeLabel(qualification.panelType),
    },
    {
      label: 'Размер',
      value: formatQualificationSize(qualification),
    },
    {
      label: 'Толщина',
      value: formatThicknessMm(qualification.thicknessMm),
    },
    {
      label: 'Цвет',
      value: formatColorLabel(qualification),
    },
    {
      label: 'Площадь',
      value: formatAreaM2(qualification.requiredAreaM2),
    },
    {
      label: 'Монтаж',
      value: installationRequiredLabel(qualification.installationRequired),
    },
  ];

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
      <h3 className="text-sm font-semibold text-slate-900">
        Контекст Stage 1
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Только для просмотра. Коммерческий выбор не меняет потребность клиента.
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-slate-500">{field.label}</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
