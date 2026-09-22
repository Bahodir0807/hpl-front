'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  useApproveInstallationCommercial,
  useCreateInstallationCommercial,
  useInstallationCommercial,
  usePatchInstallationCommercial,
  useRepriceInstallationCommercial,
  useSubmitInstallationCommercial,
  type InstallationCommercialCalculation,
} from '@/hooks/use-installation-commercial';
import { useI18n } from '@/i18n/provider';

function statusLabel(
  status: string,
  t: (key: 'installationPricing.statusDraft' | 'installationPricing.statusReady' | 'installationPricing.statusApproved') => string,
) {
  if (status === 'READY_FOR_APPROVAL') {
    return t('installationPricing.statusReady');
  }
  if (status === 'APPROVED') {
    return t('installationPricing.statusApproved');
  }
  return t('installationPricing.statusDraft');
}

export function InstallationCommercialPanel({ leadId }: { leadId: string }) {
  const { t } = useI18n();
  const query = useInstallationCommercial(leadId);
  const create = useCreateInstallationCommercial(leadId);
  const patch = usePatchInstallationCommercial(leadId);
  const submit = useSubmitInstallationCommercial(leadId);
  const approve = useApproveInstallationCommercial(leadId);
  const reprice = useRepriceInstallationCommercial(leadId);

  if (query.isLoading) {
    return (
      <section className="rounded border border-slate-200 bg-white p-4 text-sm">
        <p>{t('installationPricing.commercialLoading')}</p>
      </section>
    );
  }
  if (query.isError || !query.data) {
    return (
      <section className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{t('installationPricing.commercialLoadFailed')}</p>
      </section>
    );
  }

  const workspace = query.data;
  if (!workspace.applicable) {
    return null;
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
        {t('installationPricing.title')}
      </h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {t('installationPricing.subtitle')}
      </p>
      {!workspace.calculation ? (
        <div className="mt-3">
          <p className="text-sm">{t('installationPricing.noCalculation')}</p>
          {workspace.canPrepare ? (
            <Button
              type="button"
              className="mt-2"
              disabled={create.isPending}
              onClick={() => void create.mutateAsync()}
            >
              {t('installationPricing.create')}
            </Button>
          ) : null}
        </div>
      ) : (
        <CommercialBody
          leadId={leadId}
          workspace={workspace}
          calculation={workspace.calculation}
          t={t}
          patch={patch}
          submit={submit}
          approve={approve}
          reprice={reprice}
        />
      )}
    </section>
  );
}

function CommercialBody({
  workspace,
  calculation,
  t,
  patch,
  submit,
  approve,
  reprice,
}: {
  leadId: string;
  workspace: NonNullable<ReturnType<typeof useInstallationCommercial>['data']>;
  calculation: InstallationCommercialCalculation;
  t: (key: string) => string;
  patch: ReturnType<typeof usePatchInstallationCommercial>;
  submit: ReturnType<typeof useSubmitInstallationCommercial>;
  approve: ReturnType<typeof useApproveInstallationCommercial>;
  reprice: ReturnType<typeof useRepriceInstallationCommercial>;
}) {
  const [amount, setAmount] = useState(calculation.proposedCustomerAmount ?? '');
  const [currency, setCurrency] = useState(calculation.proposedCurrency ?? '');
  const [note, setNote] = useState(calculation.commercialNote ?? '');
  const busy =
    patch.isPending || submit.isPending || approve.isPending || reprice.isPending;
  const costBlocked = Boolean(calculation.costIncomplete);
  const canMutate = workspace.canPrepare && calculation.status !== 'APPROVED';
  const costRows = Array.isArray(calculation.costByCurrency)
    ? (calculation.costByCurrency as Array<{ currency: string; amount: string }>)
    : [];

  if (!workspace.canReadCost && !workspace.canPrepare && !workspace.canApprove) {
    return (
      <div className="mt-3 space-y-2 text-sm">
        {calculation.status === 'APPROVED' ? (
          <>
            <p className="font-medium">{t('installationPricing.managerApproved')}</p>
            <p>
              {calculation.approvedCustomerAmount} {calculation.approvedCurrency}
            </p>
            <p className="text-slate-500">
              {t('installationPricing.managerHiddenCost')}
            </p>
          </>
        ) : (
          <p>{t('installationPricing.noCalculation')}</p>
        )}
      </div>
    );
  }

  return (
    <div
      key={`${calculation.id}-${calculation.revision}`}
      className="mt-3 space-y-4 text-sm"
    >
      {calculation.staleTechnicalBasis ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-2 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          {t('installationPricing.staleTechnical')}
        </p>
      ) : null}
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">{t('installationPricing.technicalRevision')}</dt>
          <dd>{calculation.installationCalculationRevision}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('installationPricing.commercialRevision')}</dt>
          <dd>{calculation.revision}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('common.status')}</dt>
          <dd>{statusLabel(calculation.status, t as never)}</dd>
        </div>
      </dl>

      <div className="space-y-3">
        {calculation.items.map((item) => (
          <article key={item.id} className="rounded border border-slate-200 p-3 dark:border-slate-700">
            <p className="font-medium">
              {item.workTypeName} · {item.quantity} {item.unit}
            </p>
            {workspace.canReadCost ? (
              <>
                {item.priceStatus === 'NOT_CONFIGURED' ? (
                  <p className="text-amber-800 dark:text-amber-200">{t('installationPricing.missingRate')}</p>
                ) : null}
                {item.priceStatus === 'INCOMPATIBLE_UNIT' ? (
                  <p className="text-amber-800 dark:text-amber-200">
                    {t('installationPricing.incompatibleUnit')}
                  </p>
                ) : null}
                {item.lineCostTotal ? (
                  <p>
                    {item.contractorName}: {item.lineCostTotal} {item.currency}
                  </p>
                ) : null}
                {canMutate ? (
                  <label className="mt-2 block">
                    {t('installationPricing.selectRate')}
                    <select
                      className="mt-1 w-full rounded border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-950"
                      defaultValue={item.selectedRateId ?? ''}
                      aria-label={t('installationPricing.selectRate')}
                      onChange={(event) => {
                        void patch.mutateAsync({
                          expectedRevision: calculation.revision,
                          selections: [
                            {
                              itemId: item.id,
                              rateId: event.target.value || null,
                            },
                          ],
                        });
                      }}
                    >
                      <option value="">{t('installationPricing.missingRate')}</option>
                      {workspace.rates
                        .filter(
                          (rate) =>
                            rate.workTypeCode === item.workTypeCode &&
                            rate.unit === item.unit &&
                            rate.isActive,
                        )
                        .map((rate) => (
                          <option key={rate.id} value={rate.id}>
                            {rate.contractorName} {rate.pricePerUnit} {rate.currency}/
                            {rate.unit}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}
              </>
            ) : null}
          </article>
        ))}
      </div>

      {workspace.canReadCost ? (
        <div>
          <p className="font-medium">{t('installationPricing.cost')}</p>
          {costBlocked ? (
            <p className="text-amber-800 dark:text-amber-200">
              {t('installationPricing.costIncomplete')}
            </p>
          ) : null}
          {costRows.map((row) => (
            <p key={row.currency}>
              {row.amount} {row.currency}
            </p>
          ))}
          <p className="text-xs text-slate-500">
            {t('installationPricing.missingRateHint')}
          </p>
        </div>
      ) : (
        <p>{t('installationPricing.managerHiddenCost')}</p>
      )}

      {calculation.status === 'APPROVED' ? (
        <div>
          <p className="font-medium">{t('installationPricing.managerApproved')}</p>
          <p>
            {calculation.approvedCustomerAmount} {calculation.approvedCurrency}
          </p>
          <p>
            {t('installationPricing.approvedBy')}: {calculation.approverRoleSnapshot}
          </p>
          <p>
            {t('installationPricing.approvedAt')}: {calculation.approvedAt}
          </p>
          <p>{t('installationPricing.approvedImmutable')}</p>
        </div>
      ) : null}

      {canMutate ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label>
            {t('installationPricing.customerAmount')}
            <input
              className="mt-1 w-full rounded border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-950"
              aria-label={t('installationPricing.customerAmount')}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label>
            {t('installationPricing.customerCurrency')}
            <input
              className="mt-1 w-full rounded border border-slate-300 p-2 uppercase dark:border-slate-600 dark:bg-slate-950"
              aria-label={t('installationPricing.customerCurrency')}
              value={currency}
              maxLength={8}
              onChange={(event) => setCurrency(event.target.value)}
            />
          </label>
          <label className="sm:col-span-2">
            {t('installationPricing.commercialNote')}
            <textarea
              className="mt-1 w-full rounded border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-950"
              aria-label={t('installationPricing.commercialNote')}
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void patch.mutateAsync({
                expectedRevision: calculation.revision,
                proposedCustomerAmount: amount || null,
                proposedCurrency: currency || null,
                commercialNote: note || null,
              })
            }
          >
            {t('common.save')}
          </Button>
        </div>
      ) : null}

      {canMutate ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            disabled={busy || costBlocked}
            onClick={() =>
              void submit.mutateAsync({ expectedRevision: calculation.revision })
            }
          >
            {t('installationPricing.submit')}
          </Button>
          {workspace.canApprove ? (
            <Button
              type="button"
              disabled={busy || costBlocked || calculation.status !== 'READY_FOR_APPROVAL'}
              onClick={() =>
                void approve.mutateAsync({
                  expectedRevision: calculation.revision,
                })
              }
            >
              {t('installationPricing.approve')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {workspace.canPrepare && calculation.staleTechnicalBasis ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() =>
            void reprice.mutateAsync({ expectedRevision: calculation.revision })
          }
        >
          {t('installationPricing.reprice')}
        </Button>
      ) : null}
    </div>
  );
}
