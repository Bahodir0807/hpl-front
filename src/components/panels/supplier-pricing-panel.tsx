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
import { useI18n } from '@/i18n/provider';
import { useLabelMaps } from '@/i18n/use-label-maps';

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
  const { t, messages } = useI18n();
  const { supplierDisplayNames } = useLabelMaps();
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
          {t('panels.pricingTitle')}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {t('panels.pricingHint')}
        </p>
      </div>

      {canManage ? (
        <form className="mb-6 grid gap-3 md:grid-cols-2" onSubmit={(event) => void submit(event)}>
          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">{t('calculator.typeHpl')}</span>
            <select
              value={panelTypeId}
              aria-label={t('calculator.typeHpl')}
              onChange={(event) => {
                setPanelTypeId(event.target.value);
                setQualityClassId('');
                setThicknessMm('');
              }}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">{t('hpl.selectType')}</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {panelTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">{t('common.supplier')}</span>
            <select
              value={supplierId}
              aria-label={t('common.supplier')}
              onChange={(event) => {
                setSupplierId(event.target.value);
                setQualityClassId('');
              }}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">{t('validation.selectSupplier')}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {formatSupplierName(
                    supplier.code,
                    supplier.name,
                    t('common.dash'),
                    supplierDisplayNames,
                  )}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">{t('panels.qualityLine')}</span>
            <select
              value={qualityClassId}
              aria-label={t('panels.qualityLine')}
              onChange={(event) => setQualityClassId(event.target.value)}
              disabled={!selectedSupplier || !selectedType}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50"
            >
              <option value="">
                {qualityClasses.length === 0 && selectedSupplier && selectedType
                  ? t('panels.noQualityLine')
                  : t('hpl.qualityLinePlaceholder')}
              </option>
              {qualityClasses.map((quality) => (
                <option key={quality.id} value={quality.id}>
                  {qualityLineLabel(quality, messages)}
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
            <span className="mb-1 block font-medium">{t('panels.purchasePriceCny')}</span>
            <input
              type="text"
              inputMode="decimal"
              value={basePricePerM2}
              onChange={(event) => setBasePricePerM2(event.target.value)}
              placeholder="0.00"
              aria-label={t('panels.purchasePriceCny')}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <div className="flex items-end">
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {matchingPrice ? t('panels.updatePrice') : t('panels.savePrice')}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mb-4 text-xs text-slate-500">
          {t('panels.headOnly')}
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
          {t('panels.priceMissing')}
          {selectedSupplier && selectedQuality
            ? `: ${formatSupplierName(selectedSupplier.code, selectedSupplier.name, t('common.dash'), supplierDisplayNames)}, ${qualityLineLabel(selectedQuality, messages)}, ${formatThicknessMm(thicknessMm)}`
            : ''}
        </p>
      ) : null}

      {pricingQuery.isLoading ? (
        <p className="text-sm text-slate-600">{t('panels.loadingPrices')}</p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                {t('calculator.typeHpl')}
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                {t('common.supplier')}
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                {t('panels.qualityLine')}
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                {t('common.thickness')}
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                {t('panels.purchasePriceCny')}
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                {t('common.status')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {prices.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2 text-slate-700">
                  {row.panelTypes && row.panelTypes.length > 0
                    ? row.panelTypes.map((type) => panelTypeLabel(type)).join(', ')
                    : t('common.dash')}
                </td>
                <td className="px-3 py-2 text-slate-900">
                  {formatSupplierName(
                    row.supplier?.code,
                    row.supplier?.name,
                    t('common.dash'),
                    supplierDisplayNames,
                  )}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {qualityLineLabel(row.qualityClass ?? {}, messages)}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {formatThicknessMm(row.thicknessMm)}
                </td>
                <td className="px-3 py-2 text-slate-900">
                  {row.basePricePerM2 != null
                    ? `${row.basePricePerM2} CNY`
                    : t('common.dash')}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {row.isActive ? t('panels.priceActive') : t('panels.priceInactive')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!pricingQuery.isLoading && prices.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            {t('panels.priceMissing')}
          </div>
        ) : null}
      </div>
    </section>
  );
}
