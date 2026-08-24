'use client';

import { FormEvent, useMemo, useState } from 'react';
import { HplThicknessField } from '@/components/leads/hpl-thickness-field';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  PANEL_PRICING_MANAGE_PERMISSION,
  useCreateThicknessPricing,
  useThicknessPricing,
  useUpdateThicknessPricing,
} from '@/hooks/use-panel-pricing';
import {
  usePanelTypes,
  useSupplierQualityClasses,
  useSuppliers,
} from '@/hooks/use-panels';
import {
  applicationFromPanelTypeCode,
  formatThicknessMm,
  panelTypeLabel,
  toDecimalNumber,
  thicknessValidationMessage,
} from '@/lib/hpl-domain';
import { formatSupplierName } from '@/lib/labels';
import { qualityLineLabel } from '@/lib/quality-line-presentation';

const MISSING_PRICE_MESSAGE = 'Цена не настроена';

function sameThickness(left: unknown, right: unknown): boolean {
  const a = toDecimalNumber(left);
  const b = toDecimalNumber(right);
  return a !== null && b !== null && a === b;
}

export function SupplierPricingPanel() {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission(PANEL_PRICING_MANAGE_PERMISSION);
  const canReadPurchasePrice =
    user?.permissions.includes('products:read_purchase_price') ?? false;

  if (!canManage && !canReadPurchasePrice) {
    return null;
  }

  return <SupplierPricingPanelBody canManage={canManage} />;
}

function SupplierPricingPanelBody({ canManage }: { canManage: boolean }) {
  const typesQuery = usePanelTypes();
  const suppliersQuery = useSuppliers();
  const pricingQuery = useThicknessPricing(true);
  const createPricing = useCreateThicknessPricing();
  const updatePricing = useUpdateThicknessPricing();

  const types = typesQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? [];
  const prices = useMemo(() => pricingQuery.data ?? [], [pricingQuery.data]);

  const [panelTypeId, setPanelTypeId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [qualityClassId, setQualityClassId] = useState('');
  const [thicknessMm, setThicknessMm] = useState('');
  const [basePricePerM2, setBasePricePerM2] = useState('');

  const selectedType = types.find((item) => item.id === panelTypeId);
  const selectedSupplier = suppliers.find((item) => item.id === supplierId);
  const application = applicationFromPanelTypeCode(selectedType?.code);

  const qualityQuery = useSupplierQualityClasses(
    selectedSupplier?.code ?? '',
    selectedType?.code,
  );
  const qualityClasses = qualityQuery.data ?? [];
  const selectedQuality = qualityClasses.find((item) => item.id === qualityClassId);

  const matchingPrice = useMemo(
    () =>
      prices.find(
        (row) =>
          row.supplierId === supplierId &&
          row.qualityClassId === qualityClassId &&
          sameThickness(row.thicknessMm, thicknessMm) &&
          row.isActive,
      ),
    [prices, qualityClassId, supplierId, thicknessMm],
  );

  const thicknessError = thicknessMm
    ? thicknessValidationMessage(application, thicknessMm)
    : null;
  const numericPrice = Number(basePricePerM2.trim().replace(',', '.'));
  const priceValid = Number.isFinite(numericPrice) && numericPrice > 0;
  const canSubmit =
    canManage &&
    Boolean(panelTypeId && supplierId && qualityClassId && thicknessMm) &&
    !thicknessError &&
    priceValid &&
    !createPricing.isPending &&
    !updatePricing.isPending &&
    qualityClasses.length > 0;

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const price = basePricePerM2.trim().replace(',', '.');
    if (matchingPrice) {
      await updatePricing.mutateAsync({
        id: matchingPrice.id,
        basePricePerM2: price,
      });
    } else {
      await createPricing.mutateAsync({
        panelTypeId,
        supplierId,
        qualityClassId,
        thicknessMm: thicknessMm.trim().replace(',', '.'),
        basePricePerM2: price,
      });
    }

    setBasePricePerM2('');
  };

  return (
    <section
      id="supplier-pricing"
      className="rounded border border-slate-200 bg-white p-5"
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-950">
          Закупочные цены поставщиков
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Закупочная цена в CNY за м². Курс CNY → USD задаёт директор, коэффициент
          продажи фиксирован.
        </p>
      </div>

      {canManage ? (
        <form className="mb-6 grid gap-3 md:grid-cols-2" onSubmit={(event) => void submit(event)}>
          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Тип HPL</span>
            <select
              value={panelTypeId}
              aria-label="Тип HPL"
              onChange={(event) => {
                setPanelTypeId(event.target.value);
                setQualityClassId('');
                setThicknessMm('');
              }}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Выберите тип</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {panelTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Поставщик</span>
            <select
              value={supplierId}
              aria-label="Поставщик"
              onChange={(event) => {
                setSupplierId(event.target.value);
                setQualityClassId('');
              }}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Выберите поставщика</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {formatSupplierName(supplier.code, supplier.name)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Линейка</span>
            <select
              value={qualityClassId}
              aria-label="Линейка"
              onChange={(event) => setQualityClassId(event.target.value)}
              disabled={!selectedSupplier || !selectedType}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50"
            >
              <option value="">
                {qualityClasses.length === 0 && selectedSupplier && selectedType
                  ? 'Нет доступной линейки'
                  : 'Выберите линейку'}
              </option>
              {qualityClasses.map((quality) => (
                <option key={quality.id} value={quality.id}>
                  {qualityLineLabel(quality)}
                </option>
              ))}
            </select>
          </label>

          <HplThicknessField
            application={application}
            value={thicknessMm}
            onChange={setThicknessMm}
            error={thicknessError ?? undefined}
          />

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Закупочная цена, CNY</span>
            <input
              type="text"
              inputMode="decimal"
              value={basePricePerM2}
              onChange={(event) => setBasePricePerM2(event.target.value)}
              placeholder="0.00"
              aria-label="Закупочная цена, CNY"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <div className="flex items-end">
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {matchingPrice ? 'Обновить цену' : 'Сохранить цену'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mb-4 text-xs text-slate-500">
          Изменять закупочные цены может только руководитель.
        </p>
      )}

      {canManage &&
      panelTypeId &&
      supplierId &&
      qualityClassId &&
      thicknessMm &&
      !thicknessError &&
      !matchingPrice ? (
        <p className="mb-4 text-sm text-amber-800">
          {MISSING_PRICE_MESSAGE}
          {selectedSupplier && selectedQuality
            ? `: ${formatSupplierName(selectedSupplier.code, selectedSupplier.name)}, ${qualityLineLabel(selectedQuality)}, ${formatThicknessMm(thicknessMm)}`
            : ''}
        </p>
      ) : null}

      {pricingQuery.isLoading ? (
        <p className="text-sm text-slate-600">Загрузка закупочных цен...</p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Тип HPL
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Поставщик
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Линейка
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Толщина
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Закупочная цена, CNY
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Статус
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {prices.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2 text-slate-700">
                  {row.panelTypes && row.panelTypes.length > 0
                    ? row.panelTypes.map((type) => panelTypeLabel(type)).join(', ')
                    : '—'}
                </td>
                <td className="px-3 py-2 text-slate-900">
                  {formatSupplierName(row.supplier?.code, row.supplier?.name)}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {qualityLineLabel(row.qualityClass ?? {})}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {formatThicknessMm(row.thicknessMm)}
                </td>
                <td className="px-3 py-2 text-slate-900">
                  {row.basePricePerM2 != null
                    ? `${row.basePricePerM2} CNY`
                    : '—'}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {row.isActive ? 'Активна' : 'Неактивна'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!pricingQuery.isLoading && prices.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            {MISSING_PRICE_MESSAGE}
          </div>
        ) : null}
      </div>
    </section>
  );
}
