'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  CURRENCY_RATES_MANAGE_PERMISSION,
  CURRENCY_RATES_READ_PERMISSION,
  useCreateCurrencyRate,
  useCurrentCurrencyRate,
} from '@/hooks/use-currency-rates';
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/i18n/provider';

export function CurrencyRatePanel() {
  const { t } = useI18n();
  const { user } = useAuth();
  const canRead = user?.permissions.includes(CURRENCY_RATES_READ_PERMISSION) ?? false;
  const canManage =
    user?.permissions.includes(CURRENCY_RATES_MANAGE_PERMISSION) ?? false;
  const currentQuery = useCurrentCurrencyRate(canRead);
  const createRate = useCreateCurrencyRate();
  const [rate, setRate] = useState('');

  if (!canRead) {
    return null;
  }

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = rate.trim().replace(',', '.');
    const numeric = Number(trimmed);
    if (!trimmed || !Number.isFinite(numeric) || numeric <= 0) {
      return;
    }

    await createRate.mutateAsync({ rate: trimmed });
    setRate('');
  };

  const current = currentQuery.data;

  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            {t('currencySettings.title')}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {t('currencySettings.hint')}
          </p>
        </div>
        {current ? (
          <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-right">
            <div className="text-xs text-slate-500">{t('currencySettings.activeRate')}</div>
            <div className="text-lg font-semibold text-slate-950">
              1 {current.fromCurrency} = {current.rate} {current.toCurrency}
            </div>
          </div>
        ) : null}
      </div>

      {currentQuery.isLoading ? (
        <p className="mt-3 text-sm text-slate-600">{t('currencySettings.loading')}</p>
      ) : null}

      {currentQuery.isError ? (
        <p className="mt-3 text-sm text-amber-800">
          {t('currencySettings.missing')}
        </p>
      ) : null}

      {canManage ? (
        <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={(event) => void submit(event)}>
          <label className="min-w-[12rem] flex-1 text-sm text-slate-700">
            <span className="mb-1 block font-medium">{t('currencySettings.newRate')}</span>
            <input
              type="text"
              inputMode="decimal"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              placeholder="0.14"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <Button type="submit" size="sm" disabled={createRate.isPending}>
            {createRate.isPending ? t('common.saving') : t('currencySettings.saveRate')}
          </Button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          {t('currencySettings.directorOnly')}
        </p>
      )}

      {createRate.data?.effectiveFrom ? (
        <p className="mt-3 text-xs text-slate-500">
          {t('currencySettings.lastSaved', {
            date: formatDateTime(createRate.data.effectiveFrom),
          })}
        </p>
      ) : null}
    </section>
  );
}
