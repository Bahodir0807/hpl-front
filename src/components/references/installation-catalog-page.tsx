'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { canManageInstallationCatalog } from '@/lib/installation-pricing';
import { useAuth } from '@/context/auth-context';
import {
  useCreateInstallationContractor,
  useCreateInstallationRate,
  useCreateInstallationWorkType,
  useInstallationContractors,
  useInstallationRates,
  useInstallationWorkTypes,
  useUpdateInstallationContractor,
  useUpdateInstallationRate,
  useUpdateInstallationWorkType,
} from '@/hooks/use-installation-catalog';
import { useI18n } from '@/i18n/provider';

export function InstallationCatalogPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const canManage = canManageInstallationCatalog(user?.permissions);
  const workTypes = useInstallationWorkTypes();
  const contractors = useInstallationContractors();
  const rates = useInstallationRates();
  const createWorkType = useCreateInstallationWorkType();
  const updateWorkType = useUpdateInstallationWorkType();
  const createContractor = useCreateInstallationContractor();
  const updateContractor = useUpdateInstallationContractor();
  const createRate = useCreateInstallationRate();
  const updateRate = useUpdateInstallationRate();

  const [workCode, setWorkCode] = useState('');
  const [workNameRu, setWorkNameRu] = useState('');
  const [workNameUz, setWorkNameUz] = useState('');
  const [workNameEn, setWorkNameEn] = useState('');
  const [workUnit, setWorkUnit] = useState('M2');
  const [crewName, setCrewName] = useState('');
  const [crewType, setCrewType] = useState('INTERNAL_CREW');
  const [rateContractorId, setRateContractorId] = useState('');
  const [rateWorkTypeId, setRateWorkTypeId] = useState('');
  const [rateUnit, setRateUnit] = useState('M2');
  const [ratePrice, setRatePrice] = useState('');
  const [rateCurrency, setRateCurrency] = useState('USD');
  const [rateValidFrom, setRateValidFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [rateValidTo, setRateValidTo] = useState('');

  if (!canManage) {
    return <p>{t('installationPricing.noAccess')}</p>;
  }
  if (workTypes.isLoading || contractors.isLoading || rates.isLoading) {
    return <p>{t('installationPricing.loading')}</p>;
  }
  if (workTypes.isError || contractors.isError || rates.isError) {
    return <p>{t('installationPricing.loadFailed')}</p>;
  }

  const workItems = workTypes.data?.items ?? [];
  const contractorItems = contractors.data?.items ?? [];
  const rateItems = rates.data?.items ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-950 dark:text-slate-50">
          {t('installationPricing.catalogTitle')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {t('installationPricing.catalogSubtitle')}
        </p>
      </div>

      <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold">{t('installationPricing.workTypes')}</h2>
        {workItems.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            {t('installationPricing.emptyWorkTypes')}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {workItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  {item.nameRu} ({item.code}, {item.unit}) ·{' '}
                  {item.isActive
                    ? t('installationPricing.active')
                    : t('installationPricing.inactive')}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={updateWorkType.isPending}
                  onClick={() =>
                    void updateWorkType.mutateAsync({
                      id: item.id,
                      isActive: !item.isActive,
                    })
                  }
                >
                  {item.isActive
                    ? t('installationPricing.deactivate')
                    : t('installationPricing.activate')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-4 grid gap-2 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void createWorkType
              .mutateAsync({
                code: workCode,
                nameRu: workNameRu,
                nameUz: workNameUz || workNameRu,
                nameEn: workNameEn || workNameRu,
                unit: workUnit,
                category: 'OTHER',
              })
              .then(() => {
                setWorkCode('');
                setWorkNameRu('');
                setWorkNameUz('');
                setWorkNameEn('');
              });
          }}
        >
          <input
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            placeholder={t('installationPricing.code')}
            aria-label={t('installationPricing.code')}
            value={workCode}
            onChange={(event) => setWorkCode(event.target.value)}
            required
          />
          <input
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            placeholder={t('installationPricing.nameRu')}
            aria-label={t('installationPricing.nameRu')}
            value={workNameRu}
            onChange={(event) => setWorkNameRu(event.target.value)}
            required
          />
          <input
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            placeholder={t('installationPricing.nameUz')}
            aria-label={t('installationPricing.nameUz')}
            value={workNameUz}
            onChange={(event) => setWorkNameUz(event.target.value)}
          />
          <input
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            placeholder={t('installationPricing.nameEn')}
            aria-label={t('installationPricing.nameEn')}
            value={workNameEn}
            onChange={(event) => setWorkNameEn(event.target.value)}
          />
          <select
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            aria-label={t('installationPricing.unit')}
            value={workUnit}
            onChange={(event) => setWorkUnit(event.target.value)}
          >
            <option value="M2">M2</option>
            <option value="LM">LM</option>
            <option value="PCS">PCS</option>
            <option value="SET">SET</option>
            <option value="HOUR">HOUR</option>
            <option value="DAY">DAY</option>
          </select>
          <Button type="submit" disabled={createWorkType.isPending}>
            {t('installationPricing.addWorkType')}
          </Button>
        </form>
      </section>

      <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold">{t('installationPricing.contractors')}</h2>
        {contractorItems.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            {t('installationPricing.emptyContractors')}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {contractorItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  {item.name} ·{' '}
                  {item.type === 'INTERNAL_CREW'
                    ? t('installationPricing.internalCrew')
                    : t('installationPricing.externalContractor')}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={updateContractor.isPending}
                  onClick={() =>
                    void updateContractor.mutateAsync({
                      id: item.id,
                      isActive: !item.isActive,
                    })
                  }
                >
                  {item.isActive
                    ? t('installationPricing.deactivate')
                    : t('installationPricing.activate')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-4 grid gap-2 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void createContractor
              .mutateAsync({ name: crewName, type: crewType })
              .then(() => setCrewName(''));
          }}
        >
          <input
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            placeholder={t('installationPricing.contractorName')}
            aria-label={t('installationPricing.contractorName')}
            value={crewName}
            onChange={(event) => setCrewName(event.target.value)}
            required
          />
          <select
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            aria-label={t('installationPricing.contractorType')}
            value={crewType}
            onChange={(event) => setCrewType(event.target.value)}
          >
            <option value="INTERNAL_CREW">
              {t('installationPricing.internalCrew')}
            </option>
            <option value="EXTERNAL_CONTRACTOR">
              {t('installationPricing.externalContractor')}
            </option>
          </select>
          <Button type="submit" disabled={createContractor.isPending}>
            {t('installationPricing.addContractor')}
          </Button>
        </form>
      </section>

      <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold">{t('installationPricing.rates')}</h2>
        {rateItems.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            {t('installationPricing.emptyRates')}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rateItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded border border-slate-200 p-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  {item.contractorName} · {item.workTypeName}: {item.pricePerUnit}{' '}
                  {item.currency}/{item.unit}
                  <span className="mt-1 block text-xs text-slate-500">
                    {t('installationPricing.validFrom')}{' '}
                    {item.validFrom.slice(0, 10)}
                    {item.validTo
                      ? ` · ${t('installationPricing.validTo')} ${item.validTo.slice(0, 10)}`
                      : ''}
                    {' · '}
                    {item.isActive
                      ? t('installationPricing.active')
                      : t('installationPricing.inactive')}
                  </span>
                </span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {item.isActive ? (
                    <RatePriceInput
                      key={item.id}
                      item={item}
                      label={`${t('installationPricing.pricePerUnit')} ${item.workTypeName}`}
                      onSave={(pricePerUnit) =>
                        updateRate.mutateAsync({
                          id: item.id,
                          pricePerUnit,
                        })
                      }
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={updateRate.isPending}
                    onClick={() =>
                      void updateRate.mutateAsync({
                        id: item.id,
                        isActive: !item.isActive,
                      })
                    }
                  >
                    {item.isActive
                      ? t('installationPricing.deactivate')
                      : t('installationPricing.activate')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-4 grid gap-2 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const workType = workItems.find((item) => item.id === rateWorkTypeId);
            void createRate
              .mutateAsync({
                contractorId: rateContractorId,
                workTypeId: rateWorkTypeId,
                unit: rateUnit || workType?.unit || 'M2',
                pricePerUnit: ratePrice,
                currency: rateCurrency,
                validFrom: new Date(`${rateValidFrom}T00:00:00.000Z`).toISOString(),
                validTo: rateValidTo
                  ? new Date(`${rateValidTo}T00:00:00.000Z`).toISOString()
                  : null,
              })
              .then(() => setRatePrice(''));
          }}
        >
          <select
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            aria-label={t('installationPricing.contractorName')}
            value={rateContractorId}
            onChange={(event) => setRateContractorId(event.target.value)}
            required
          >
            <option value="">{t('installationPricing.contractorName')}</option>
            {contractorItems
              .filter((item) => item.isActive)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
          <select
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            aria-label={t('installationPricing.workTypes')}
            value={rateWorkTypeId}
            onChange={(event) => {
              setRateWorkTypeId(event.target.value);
              const workType = workItems.find((item) => item.id === event.target.value);
              if (workType) {
                setRateUnit(workType.unit);
              }
            }}
            required
          >
            <option value="">{t('installationPricing.workTypes')}</option>
            {workItems
              .filter((item) => item.isActive)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nameRu}
                </option>
              ))}
          </select>
          <select
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            aria-label={t('installationPricing.unit')}
            value={rateUnit}
            onChange={(event) => setRateUnit(event.target.value)}
          >
            <option value="M2">M2</option>
            <option value="LM">LM</option>
            <option value="PCS">PCS</option>
            <option value="SET">SET</option>
            <option value="HOUR">HOUR</option>
            <option value="DAY">DAY</option>
          </select>
          <input
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            placeholder={t('installationPricing.pricePerUnit')}
            aria-label={t('installationPricing.pricePerUnit')}
            value={ratePrice}
            onChange={(event) => setRatePrice(event.target.value)}
            required
          />
          <input
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            placeholder={t('installationPricing.currency')}
            aria-label={t('installationPricing.currency')}
            value={rateCurrency}
            onChange={(event) => setRateCurrency(event.target.value)}
            required
          />
          <input
            type="date"
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            aria-label={t('installationPricing.validFrom')}
            value={rateValidFrom}
            onChange={(event) => setRateValidFrom(event.target.value)}
            required
          />
          <input
            type="date"
            className="rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            aria-label={t('installationPricing.validTo')}
            value={rateValidTo}
            onChange={(event) => setRateValidTo(event.target.value)}
          />
          <Button type="submit" disabled={createRate.isPending}>
            {t('installationPricing.addRate')}
          </Button>
        </form>
      </section>
    </div>
  );
}

const ratePriceDrafts = new Map<string, string>();

function RatePriceInput({
  item,
  label,
  onSave,
}: {
  item: { id: string; pricePerUnit: string };
  label: string;
  onSave: (pricePerUnit: string) => Promise<unknown>;
}) {
  const [value, setValue] = useState(
    () => ratePriceDrafts.get(item.id) ?? item.pricePerUnit,
  );

  function persist() {
    const next = value.trim();
    if (!next || next === item.pricePerUnit) {
      ratePriceDrafts.delete(item.id);
      return;
    }
    ratePriceDrafts.set(item.id, next);
    void onSave(next).then(() => {
      if (ratePriceDrafts.get(item.id) === next) {
        ratePriceDrafts.delete(item.id);
      }
    });
  }

  return (
    <input
      className="w-28 rounded border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
      aria-label={label}
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        ratePriceDrafts.set(item.id, next);
      }}
      onBlur={persist}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          persist();
        }
      }}
    />
  );
}
