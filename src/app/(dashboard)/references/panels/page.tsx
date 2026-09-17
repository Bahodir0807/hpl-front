'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  useCreatePanelColor,
  usePanelColors,
  usePanelSizes,
  usePanelTypes,
  useSuppliers,
  useUpdatePanelColor,
} from '@/hooks/use-panels';
import { formatNumber } from '@/lib/format';
import { panelSizeLabel, panelTypeLabel } from '@/lib/hpl-domain';
import { formatSupplierName } from '@/lib/labels';
import { PanelColor, Supplier } from '@/types/hpl';
import { useI18n } from '@/i18n/provider';
import { useLabelMaps } from '@/i18n/use-label-maps';
import type { LabelMaps } from '@/i18n/label-maps';

function supplierName(
  supplierId: string,
  suppliers: Supplier[],
  fallback: string,
  displayNames: LabelMaps['supplierDisplayNames'],
): string {
  const supplier = suppliers.find((item) => item.id === supplierId);
  return supplier
    ? formatSupplierName(supplier.code, supplier.name, fallback, displayNames)
    : fallback;
}

function AddColorModal({
  suppliers,
  color,
  onClose,
}: {
  suppliers: Supplier[];
  color: PanelColor | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const labels = useLabelMaps();
  const createColor = useCreatePanelColor();
  const updateColor = useUpdatePanelColor();
  const [supplierId, setSupplierId] = useState(color?.supplierId ?? '');
  const [colorCode, setColorCode] = useState(color?.code ?? '');
  const [colorName, setColorName] = useState(color?.name ?? '');
  const isEdit = Boolean(color);
  const canSubmit =
    supplierId && colorCode.trim() && colorName.trim() && !createColor.isPending && !updateColor.isPending;

  const onSubmit = async (): Promise<void> => {
    if (color) {
      await updateColor.mutateAsync({
        id: color.id,
        supplierId,
        code: colorCode.trim(),
        name: colorName.trim(),
      });
    } else {
      await createColor.mutateAsync({
        supplierId,
        code: colorCode.trim(),
        name: colorName.trim(),
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">
          {isEdit ? t('panels.editColor') : t('panels.addColor')}
        </h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {t('common.supplier')}
            </span>
            <select
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">{t('validation.selectSupplier')}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {formatSupplierName(
                    supplier.code,
                    supplier.name,
                    t('suppliers.fallback'),
                    labels.supplierDisplayNames,
                  )}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {t('panels.colorCode')}
            </span>
            <input
              value={colorCode}
              onChange={(event) => setColorCode(event.target.value)}
              placeholder="RAL-9005"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {t('panels.colorName')}
            </span>
            <input
              value={colorName}
              onChange={(event) => setColorName(event.target.value)}
              placeholder={t('panels.colorPlaceholder')}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              void onSubmit();
            }}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PanelReferencesPage() {
  const { t, locale } = useI18n();
  const labels = useLabelMaps();
  const [supplierFilter, setSupplierFilter] = useState('');
  const [colorModal, setColorModal] = useState<PanelColor | null | 'create'>(
    null,
  );
  const suppliersQuery = useSuppliers();
  const typesQuery = usePanelTypes();
  const sizesQuery = usePanelSizes();
  const colorsQuery = usePanelColors(supplierFilter || undefined);
  const suppliers = suppliersQuery.data ?? [];
  const colors = colorsQuery.data ?? [];

  const editingColor = useMemo(
    () => (colorModal && colorModal !== 'create' ? colorModal : null),
    [colorModal],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">
          {t('panels.title')}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{t('panels.subtitle')}</p>
      </div>

      <section id="colors" className="rounded border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-950">
            {t('panels.colors')}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={supplierFilter}
              onChange={(event) => setSupplierFilter(event.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="">{t('common.allSuppliers')}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {formatSupplierName(
                    supplier.code,
                    supplier.name,
                    t('suppliers.fallback'),
                    labels.supplierDisplayNames,
                  )}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" onClick={() => setColorModal('create')}>
              {t('panels.addColor')}
            </Button>
          </div>
        </div>
        {colorsQuery.isLoading ? (
          <p className="text-sm text-slate-600">{t('panels.loadingColors')}</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('common.supplier')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('panels.colorCode')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('panels.colorName')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {colors.map((color) => (
                <tr
                  key={color.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setColorModal(color)}
                >
                  <td className="px-3 py-2 text-slate-700">
                    {supplierName(
                      color.supplierId,
                      suppliers,
                      t('common.dash'),
                      labels.supplierDisplayNames,
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-900">
                    {color.code ?? t('common.dash')}
                  </td>
                  <td className="px-3 py-2 text-slate-900">{color.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!colorsQuery.isLoading && colors.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              {t('panels.colorsEmpty')}
            </div>
          ) : null}
        </div>
      </section>

      <section id="sizes" className="rounded border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-950">
          {t('panels.sizes')}
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('panels.size')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('panels.width')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('panels.length')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('panels.areaM2')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(sizesQuery.data ?? []).map((size) => (
                <tr key={size.id}>
                  <td className="px-3 py-2 text-slate-900">
                    {panelSizeLabel(size)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{size.widthMm}</td>
                  <td className="px-3 py-2 text-slate-700">{size.heightMm}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {formatNumber(size.areaM2, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="types" className="rounded border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-950">
          {t('panels.types')}
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('panels.code')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('panels.name')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(typesQuery.data ?? []).map((type) => (
                <tr key={type.id}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">
                    {type.code}
                  </td>
                  <td className="px-3 py-2 text-slate-900">
                    {panelTypeLabel(type)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="suppliers" className="rounded border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-950">
          {t('navigation.suppliers')}
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('panels.name')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('panels.code')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('panels.leadTime')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t('panels.margin')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {formatSupplierName(
                      supplier.code,
                      supplier.name,
                      t('suppliers.fallback'),
                      labels.supplierDisplayNames,
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">
                    {supplier.code}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {supplier.deliveryDays ?? t('common.dash')}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {formatNumber(supplier.marginPercent, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {colorModal ? (
        <AddColorModal
          suppliers={suppliers}
          color={editingColor}
          onClose={() => setColorModal(null)}
        />
      ) : null}
    </div>
  );
}
