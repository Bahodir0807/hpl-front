'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  useApproveFacadeCommercial,
  useCreateFacadeCommercial,
  useFacadeCommercial,
  usePatchFacadeCommercial,
  useRepriceFacadeCommercial,
  useSubmitFacadeCommercial,
  type FacadeCommercialCalculation,
  type FacadeCommercialItem,
  type FacadeCommercialOfferOption,
} from '@/hooks/use-facade-commercial';
import { useI18n } from '@/i18n/provider';
import {
  canApproveFacadeCommercial,
  canPrepareFacadeCommercial,
  canReadFacadePurchase,
} from '@/lib/facade-pricing';
import { prefersEngineerWorkspace } from '@/lib/engineering';

function statusLabel(
  status: string,
  t: (key: 'facadePricing.statusDraft' | 'facadePricing.statusReady' | 'facadePricing.statusApproved') => string,
) {
  if (status === 'READY_FOR_APPROVAL') {
    return t('facadePricing.statusReady');
  }
  if (status === 'APPROVED') {
    return t('facadePricing.statusApproved');
  }
  return t('facadePricing.statusDraft');
}

export function FacadeCommercialPanel({ leadId }: { leadId: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const isEngineer = prefersEngineerWorkspace(permissions);
  const canPrepare = canPrepareFacadeCommercial(permissions);
  const canApprove = canApproveFacadeCommercial(permissions);
  const canReadPurchase = canReadFacadePurchase(permissions);
  const workspaceQuery = useFacadeCommercial(leadId, !isEngineer);
  const createCommercial = useCreateFacadeCommercial(leadId);
  const patchCommercial = usePatchFacadeCommercial(leadId);
  const submitCommercial = useSubmitFacadeCommercial(leadId);
  const approveCommercial = useApproveFacadeCommercial(leadId);
  const repriceCommercial = useRepriceFacadeCommercial(leadId);

  if (isEngineer) {
    return null;
  }

  if (workspaceQuery.isLoading) {
    return (
      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <p>{t('facadePricing.loading')}</p>
      </section>
    );
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return (
      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <p>{t('facadePricing.loadFailed')}</p>
      </section>
    );
  }

  const workspace = workspaceQuery.data;
  const calculation = workspace.calculation;

  return (
    <section className="mt-5 space-y-3 rounded-lg border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900 dark:bg-amber-950/20">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          {t('facadePricing.title')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('facadePricing.subtitle')}
        </p>
      </div>

      {!calculation ? (
        <div className="space-y-2">
          <p className="text-sm">{t('facadePricing.noCalculation')}</p>
          {canPrepare ? (
            <Button
              type="button"
              disabled={createCommercial.isPending}
              onClick={() => {
                void createCommercial.mutateAsync();
              }}
            >
              {t('facadePricing.create')}
            </Button>
          ) : null}
        </div>
      ) : (
        <CommercialBody
          key={`${calculation.id}-${calculation.revision}`}
          calculation={calculation}
          offers={workspace.offers}
          canPrepare={canPrepare}
          canApprove={canApprove}
          canReadPurchase={canReadPurchase}
          stale={workspace.staleTechnicalBasis || calculation.staleTechnicalBasis}
          busy={
            patchCommercial.isPending ||
            submitCommercial.isPending ||
            approveCommercial.isPending ||
            repriceCommercial.isPending
          }
          onSave={(payload) => {
            void patchCommercial.mutateAsync(payload);
          }}
          onSubmit={() => {
            void submitCommercial.mutateAsync(calculation.revision);
          }}
          onApprove={() => {
            void approveCommercial.mutateAsync(calculation.revision);
          }}
          onReprice={() => {
            void repriceCommercial.mutateAsync(calculation.revision);
          }}
        />
      )}
    </section>
  );
}

function CommercialBody({
  calculation,
  offers,
  canPrepare,
  canApprove,
  canReadPurchase,
  stale,
  busy,
  onSave,
  onSubmit,
  onApprove,
  onReprice,
}: {
  calculation: FacadeCommercialCalculation;
  offers: FacadeCommercialOfferOption[];
  canPrepare: boolean;
  canApprove: boolean;
  canReadPurchase: boolean;
  stale: boolean;
  busy: boolean;
  onSave: (payload: {
    expectedRevision: number;
    selections?: Array<{ itemId: string; offerId: string | null }>;
    proposedCustomerAmount?: string | null;
    proposedCurrency?: string | null;
    commercialNote?: string | null;
  }) => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReprice: () => void;
}) {
  const { t } = useI18n();
  const approved = calculation.status === 'APPROVED';
  const procurementBlocked = Boolean(calculation.procurementIncomplete);
  const [amount, setAmount] = useState(calculation.proposedCustomerAmount ?? '');
  const [currency, setCurrency] = useState(calculation.proposedCurrency ?? 'USD');
  const [note, setNote] = useState(calculation.commercialNote ?? '');
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const item of calculation.items) {
      if (item.selectedOfferId) {
        initial[item.id] = item.selectedOfferId;
      }
    }
    return initial;
  });

  const procurement = Array.isArray(calculation.procurementByCurrency)
    ? (calculation.procurementByCurrency as Array<{ currency: string; amount: string }>)
    : [];

  if (!canReadPurchase && !canPrepare && !canApprove) {
    return (
      <div className="space-y-2 text-sm">
        {approved && calculation.approvedCustomerAmount ? (
          <>
            <p className="font-medium">{t('facadePricing.managerApproved')}</p>
            <p>
              {calculation.approvedCustomerAmount} {calculation.approvedCurrency}
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              {t('facadePricing.managerHiddenProcurement')}
            </p>
          </>
        ) : (
          <p>{t('facadePricing.noCalculation')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stale ? (
        <p
          role="alert"
          className="rounded border border-amber-400 bg-amber-100 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
          {t('facadePricing.staleTechnical')}
        </p>
      ) : null}

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">{t('facadePricing.technicalRevision')}</dt>
          <dd>
            {calculation.facadeCalculationRevision}
            {calculation.currentTechnicalRevision &&
            calculation.currentTechnicalRevision !==
              calculation.facadeCalculationRevision
              ? ` → ${calculation.currentTechnicalRevision}`
              : ''}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('facadePricing.commercialRevision')}</dt>
          <dd>{calculation.revision}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('facadePricing.area')}</dt>
          <dd>{calculation.claddingAreaM2 ?? t('common.dash')}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('facadePricing.config')}</dt>
          <dd>{calculation.configCode ?? t('common.dash')}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('common.status')}</dt>
          <dd>{statusLabel(calculation.status, t)}</dd>
        </div>
      </dl>

      <div className="space-y-3 md:hidden">
        {calculation.items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            offers={offers}
            canReadPurchase={canReadPurchase}
            canPrepare={canPrepare && !approved}
            selectedOfferId={selections[item.id] ?? ''}
            onSelect={(offerId) => {
              setSelections((current) => ({ ...current, [item.id]: offerId }));
            }}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-2 py-2">{t('engineering.facadeMaterial')}</th>
              <th className="px-2 py-2">{t('engineering.facadeFinalQty')}</th>
              {canReadPurchase ? (
                <th className="px-2 py-2">{t('facadePricing.selectOffer')}</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {calculation.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-2 py-2">
                  {item.materialName}
                  {item.excludedFromSubsystemCommercialCost ? (
                    <div className="text-xs text-slate-500">
                      {t('facadePricing.excludedHpl')}
                    </div>
                  ) : null}
                </td>
                <td className="px-2 py-2">{item.finalQty}</td>
                {canReadPurchase ? (
                  <td className="px-2 py-2">
                    <OfferSelect
                      item={item}
                      offers={offers}
                      disabled={!canPrepare || approved}
                      value={selections[item.id] ?? ''}
                      onChange={(value) => {
                        setSelections((current) => ({
                          ...current,
                          [item.id]: value,
                        }));
                      }}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canReadPurchase ? (
        <div className="rounded border border-slate-200 p-3 text-sm dark:border-slate-800">
          <p className="font-medium">{t('facadePricing.procurement')}</p>
          {calculation.procurementIncomplete ? (
            <p className="text-amber-800 dark:text-amber-200">
              {t('facadePricing.procurementIncomplete')}
            </p>
          ) : null}
          {procurement.length === 0 ? (
            <p>{t('facadePricing.missingPriceHint')}</p>
          ) : (
            procurement.map((row) => (
              <p key={row.currency}>
                {row.amount} {row.currency}
              </p>
            ))
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('facadePricing.managerHiddenProcurement')}
        </p>
      )}

      {approved ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="font-medium">{t('facadePricing.managerApproved')}</p>
          <p>
            {calculation.approvedCustomerAmount} {calculation.approvedCurrency}
          </p>
          <p>
            {t('facadePricing.approvedBy')}: {calculation.approverRoleSnapshot}
          </p>
          <p>
            {t('facadePricing.approvedAt')}: {calculation.approvedAt}
          </p>
          <p>{t('facadePricing.approvedImmutable')}</p>
        </div>
      ) : canPrepare ? (
        <div className="space-y-3">
          <label className="block text-sm">
            {t('facadePricing.customerAmount')}
            <input
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label className="block text-sm">
            {t('facadePricing.customerCurrency')}
            <input
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 uppercase dark:border-slate-700 dark:bg-slate-900"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              maxLength={3}
            />
          </label>
          <label className="block text-sm">
            {t('facadePricing.commercialNote')}
            <textarea
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                onSave({
                  expectedRevision: calculation.revision,
                  selections: Object.entries(selections).map(([itemId, offerId]) => ({
                    itemId,
                    offerId: offerId || null,
                  })),
                  proposedCustomerAmount: amount || null,
                  proposedCurrency: currency || null,
                  commercialNote: note || null,
                });
              }}
            >
              {t('common.save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || procurementBlocked}
              onClick={onSubmit}
            >
              {t('facadePricing.submit')}
            </Button>
            {canApprove ? (
              <Button
                type="button"
                disabled={busy || procurementBlocked}
                onClick={onApprove}
              >
                {t('facadePricing.approve')}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {stale && canPrepare ? (
        <Button type="button" variant="secondary" disabled={busy} onClick={onReprice}>
          {t('facadePricing.reprice')}
        </Button>
      ) : null}
    </div>
  );
}

function ItemCard({
  item,
  offers,
  canReadPurchase,
  canPrepare,
  selectedOfferId,
  onSelect,
}: {
  item: FacadeCommercialItem;
  offers: FacadeCommercialOfferOption[];
  canReadPurchase: boolean;
  canPrepare: boolean;
  selectedOfferId: string;
  onSelect: (offerId: string) => void;
}) {
  const { t } = useI18n();
  return (
    <article className="rounded border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="font-medium">{item.materialName}</p>
      <p>
        {t('engineering.facadeFinalQty')}: {item.finalQty}
      </p>
      {item.excludedFromSubsystemCommercialCost ? (
        <p className="text-xs text-slate-500">{t('facadePricing.excludedHpl')}</p>
      ) : canReadPurchase ? (
        <OfferSelect
          item={item}
          offers={offers}
          disabled={!canPrepare}
          value={selectedOfferId}
          onChange={onSelect}
        />
      ) : null}
      {item.priceStatus === 'NOT_CONFIGURED' ? (
        <p className="text-amber-800 dark:text-amber-200">
          {t('facadePricing.missingPrice')}
        </p>
      ) : null}
    </article>
  );
}

function OfferSelect({
  item,
  offers,
  disabled,
  value,
  onChange,
}: {
  item: FacadeCommercialItem;
  offers: FacadeCommercialOfferOption[];
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const options = useMemo(
    () =>
      offers.filter(
        (offer) =>
          offer.materialCode === item.materialCode ||
          offer.materialId === item.materialCode,
      ),
    [item.materialCode, offers],
  );
  if (item.excludedFromSubsystemCommercialCost) {
    return <span>{t('facadePricing.excludedHpl')}</span>;
  }
  return (
    <select
      className="w-full rounded border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900"
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={t('facadePricing.selectOffer')}
    >
      <option value="">{t('facadePricing.missingPrice')}</option>
      {options.map((offer) => (
        <option key={offer.id} value={offer.id} disabled={!offer.isActive}>
          {offer.supplierName} — {offer.purchasePrice} {offer.currency}
          {offer.isActive ? '' : ` (${t('facadePricing.inactive')})`}
        </option>
      ))}
    </select>
  );
}
