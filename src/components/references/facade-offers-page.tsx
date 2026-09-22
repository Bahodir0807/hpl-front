'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  useCreateFacadeOffer,
  useFacadeOffers,
  useUpdateFacadeOffer,
  type FacadeOffer,
} from '@/hooks/use-facade-offers';
import { useI18n } from '@/i18n/provider';
import {
  canManageFacadeOffers,
  canReadFacadePurchase,
} from '@/lib/facade-pricing';

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

export function FacadeOffersPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const canRead = canReadFacadePurchase(user?.permissions);
  const canManage = canManageFacadeOffers(user?.permissions);
  const offersQuery = useFacadeOffers(canRead);
  const createOffer = useCreateFacadeOffer();
  const updateOffer = useUpdateFacadeOffer();
  const [editing, setEditing] = useState<FacadeOffer | null>(null);
  const [creating, setCreating] = useState(false);

  if (!canRead) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <p>{t('facadePricing.noAccess')}</p>
      </section>
    );
  }

  if (offersQuery.isLoading) {
    return <p>{t('facadePricing.offersLoading')}</p>;
  }
  if (offersQuery.isError || !offersQuery.data) {
    return <p>{t('facadePricing.offersLoadFailed')}</p>;
  }

  const { items, materials, suppliers } = offersQuery.data;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {t('facadePricing.offersTitle')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('facadePricing.offersSubtitle')}
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => setCreating(true)}>
            {t('facadePricing.createOffer')}
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('facadePricing.offersEmpty')}
        </p>
      ) : (
        <div className="space-y-3 md:hidden">
          {items.map((offer) => (
            <article
              key={offer.id}
              className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <p className="font-medium">
                {localizedName(offer.material, locale)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {offer.supplier.name}
              </p>
              <p className="mt-1 text-sm">
                {offer.purchasePrice} {offer.currency} / {offer.unit}
              </p>
              <p className="text-sm">
                {offer.isActive
                  ? t('facadePricing.active')
                  : t('facadePricing.inactive')}
              </p>
              {canManage ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditing(offer)}
                  >
                    {t('common.edit')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={updateOffer.isPending}
                    onClick={() => {
                      void updateOffer.mutateAsync({
                        id: offer.id,
                        isActive: !offer.isActive,
                      });
                    }}
                  >
                    {offer.isActive
                      ? t('facadePricing.deactivate')
                      : t('facadePricing.activate')}
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {items.length > 0 ? (
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 py-2">{t('facadePricing.material')}</th>
                <th className="px-3 py-2">{t('facadePricing.supplier')}</th>
                <th className="px-3 py-2">{t('facadePricing.purchasePrice')}</th>
                <th className="px-3 py-2">{t('facadePricing.currency')}</th>
                <th className="px-3 py-2">{t('common.status')}</th>
                <th className="px-3 py-2">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((offer) => (
                <tr
                  key={offer.id}
                  className="border-b border-slate-100 dark:border-slate-800"
                >
                  <td className="px-3 py-2">
                    {localizedName(offer.material, locale)}
                  </td>
                  <td className="px-3 py-2">{offer.supplier.name}</td>
                  <td className="px-3 py-2">{offer.purchasePrice}</td>
                  <td className="px-3 py-2">{offer.currency}</td>
                  <td className="px-3 py-2">
                    {offer.isActive
                      ? t('facadePricing.active')
                      : t('facadePricing.inactive')}
                  </td>
                  <td className="px-3 py-2">
                    {canManage ? (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditing(offer)}
                        >
                          {t('common.edit')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            void updateOffer.mutateAsync({
                              id: offer.id,
                              isActive: !offer.isActive,
                            });
                          }}
                        >
                          {offer.isActive
                            ? t('facadePricing.deactivate')
                            : t('facadePricing.activate')}
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {creating || editing ? (
        <OfferForm
          offer={editing}
          materials={materials}
          suppliers={suppliers}
          busy={createOffer.isPending || updateOffer.isPending}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={(payload) => {
            if (editing) {
              const {
                supplierId,
                purchasePrice,
                currency,
                unit,
                validFrom,
                validTo,
                availability,
                leadTimeDays,
                supplierSku,
                note,
              } = payload;
              void updateOffer
                .mutateAsync({
                  id: editing.id,
                  supplierId,
                  purchasePrice,
                  currency,
                  unit,
                  validFrom,
                  validTo,
                  availability,
                  leadTimeDays,
                  supplierSku,
                  note,
                })
                .then(() => {
                  setEditing(null);
                });
            } else {
              void createOffer.mutateAsync(payload).then(() => {
                setCreating(false);
              });
            }
          }}
        />
      ) : null}
    </section>
  );
}

function OfferForm({
  offer,
  materials,
  suppliers,
  busy,
  onClose,
  onSubmit,
}: {
  offer: FacadeOffer | null;
  materials: Array<{
    id: string;
    code: string;
    nameRu: string;
    nameEn: string;
    nameUz: string;
    unit: string;
  }>;
  suppliers: Array<{ id: string; code: string; name: string }>;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    materialId: string;
    supplierId: string;
    purchasePrice: string;
    currency: string;
    unit: string;
    validFrom: string;
    validTo?: string | null;
    availability?: string | null;
    leadTimeDays?: number | null;
    supplierSku?: string | null;
    note?: string | null;
  }) => void;
}) {
  const { t, locale } = useI18n();
  const [materialId, setMaterialId] = useState(offer?.materialId ?? materials[0]?.id ?? '');
  const selectedMaterial = useMemo(
    () => materials.find((item) => item.id === materialId),
    [materialId, materials],
  );
  const [supplierId, setSupplierId] = useState(offer?.supplierId ?? suppliers[0]?.id ?? '');
  const [purchasePrice, setPurchasePrice] = useState(offer?.purchasePrice ?? '');
  const [currency, setCurrency] = useState(offer?.currency ?? 'USD');
  const [unit, setUnit] = useState(offer?.unit ?? selectedMaterial?.unit ?? 'PCS');
  const [validFrom, setValidFrom] = useState(
    offer?.validFrom?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [validTo, setValidTo] = useState(offer?.validTo?.slice(0, 10) ?? '');
  const [availability, setAvailability] = useState(offer?.availability ?? '');
  const [leadTimeDays, setLeadTimeDays] = useState(
    offer?.leadTimeDays !== null && offer?.leadTimeDays !== undefined
      ? String(offer.leadTimeDays)
      : '',
  );
  const [supplierSku, setSupplierSku] = useState(offer?.supplierSku ?? '');
  const [note, setNote] = useState(offer?.note ?? '');

  return (
    <form
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          materialId,
          supplierId,
          purchasePrice,
          currency,
          unit,
          validFrom: new Date(validFrom).toISOString(),
          validTo: validTo ? new Date(validTo).toISOString() : null,
          availability: availability || null,
          leadTimeDays: leadTimeDays === '' ? null : Number(leadTimeDays),
          supplierSku: supplierSku || null,
          note: note || null,
        });
      }}
    >
      <h2 className="font-medium">
        {offer ? t('facadePricing.editOffer') : t('facadePricing.createOffer')}
      </h2>
      <label className="block text-sm">
        {t('facadePricing.material')}
        <select
          className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900"
          value={materialId}
          disabled={Boolean(offer)}
          onChange={(event) => {
            setMaterialId(event.target.value);
            const next = materials.find((item) => item.id === event.target.value);
            if (next) {
              setUnit(next.unit);
            }
          }}
        >
          {materials.map((material) => (
            <option key={material.id} value={material.id}>
              {localizedName(material, locale)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        {t('facadePricing.supplier')}
        <select
          className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900"
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
        >
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        {t('facadePricing.purchasePrice')}
        <input
          className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900"
          value={purchasePrice}
          onChange={(event) => setPurchasePrice(event.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        {t('facadePricing.currency')}
        <input
          className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 uppercase dark:border-slate-700 dark:bg-slate-900"
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          maxLength={3}
          required
        />
      </label>
      <label className="block text-sm">
        {t('facadePricing.validFrom')}
        <input
          type="date"
          className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900"
          value={validFrom}
          onChange={(event) => setValidFrom(event.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        {t('facadePricing.validTo')}
        <input
          type="date"
          className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900"
          value={validTo}
          onChange={(event) => setValidTo(event.target.value)}
        />
      </label>
      <label className="block text-sm">
        {t('facadePricing.availability')}
        <input
          className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900"
          value={availability}
          onChange={(event) => setAvailability(event.target.value)}
        />
      </label>
      <label className="block text-sm">
        {t('facadePricing.leadTime')}
        <input
          className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900"
          value={leadTimeDays}
          onChange={(event) => setLeadTimeDays(event.target.value)}
        />
      </label>
      <label className="block text-sm">
        {t('facadePricing.supplierSku')}
        <input
          className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900"
          value={supplierSku}
          onChange={(event) => setSupplierSku(event.target.value)}
        />
      </label>
      <label className="block text-sm">
        {t('facadePricing.note')}
        <textarea
          className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !materialId || !supplierId}>
          {t('common.save')}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
