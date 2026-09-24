'use client';

import { formatMoney, normalizeCurrency } from '@/lib/currency';
import type { QuoteComposition, QuoteCompositionComponent } from '@/types/hpl';
import { useI18n } from '@/i18n/provider';
import type { TranslateFn } from '@/i18n/translate';

const COMPOSITION_API_WARNING_KEYS: Record<string, string> = {
  'Цена HPL ещё не утверждена': 'quotes.compositionHplUnpriced',
  'HPL расчёт ещё не готов': 'quotes.compositionHplNotReady',
  'Ожидает коммерческого утверждения': 'quotes.compositionAwaiting',
  'Технический расчёт изменён после утверждения коммерческой стоимости':
    'quotes.compositionStale',
};

function positiveCustomerAmount(amount?: string | null): string | null {
  if (!amount) {
    return null;
  }
  const value = Number(amount);
  return Number.isFinite(value) && value > 0 ? amount : null;
}

function readinessText(
  component: QuoteCompositionComponent,
  t: TranslateFn,
): string {
  const amount = positiveCustomerAmount(component.amount);
  if (component.readiness === 'READY' && amount && component.currency) {
    return t('quotes.compositionReady');
  }
  if (component.readiness === 'READY' && component.kind === 'HPL' && !amount) {
    return t('quotes.compositionHplUnpriced');
  }
  if (component.readiness === 'STALE_APPROVED') {
    return t('quotes.compositionStale');
  }
  if (component.readiness === 'AWAITING_APPROVAL' || component.readiness === 'MISSING') {
    return t('quotes.compositionAwaiting');
  }
  return t('quotes.compositionNotRequired');
}

function localizeCompositionWarning(
  warning: string | null | undefined,
  t: TranslateFn,
): string | null {
  if (!warning) {
    return null;
  }
  const key = COMPOSITION_API_WARNING_KEYS[warning];
  return key ? t(key) : warning;
}

function extraCompositionWarning(
  component: QuoteCompositionComponent,
  t: TranslateFn,
): string | null {
  const localized = localizeCompositionWarning(component.warning, t);
  if (!localized) {
    return null;
  }
  return localized === readinessText(component, t) ? null : localized;
}

export function QuoteCompositionPanel({
  composition,
  acknowledgeStale,
  onAcknowledgeStaleChange,
  loading,
  error,
}: {
  composition?: QuoteComposition | null;
  acknowledgeStale: boolean;
  onAcknowledgeStaleChange: (value: boolean) => void;
  loading?: boolean;
  error?: boolean;
}) {
  const { t } = useI18n();
  if (loading) {
    return (
      <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('quotes.compositionLoading')}
        </p>
      </section>
    );
  }
  if (error || !composition) {
    return (
      <section className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        {t('quotes.compositionLoadFailed')}
      </section>
    );
  }

  const visible = composition.components.filter(
    (component) => component.required !== false || component.kind === 'HPL',
  );

  return (
    <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
        {t('quotes.compositionTitle')}
      </h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {t('quotes.compositionSubtitle')}
      </p>
      <ul className="mt-3 space-y-2">
        {visible.map((component) => {
          if (component.readiness === 'NOT_REQUIRED' && component.kind !== 'HPL') {
            return null;
          }
          const currency = component.currency
            ? normalizeCurrency(component.currency)
            : 'USD';
          const extraWarning = extraCompositionWarning(component, t);
          return (
            <li
              key={component.kind}
              className="rounded border border-slate-200 px-3 py-2 dark:border-slate-700"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-slate-950 dark:text-slate-50">
                  {component.kind === 'HPL'
                    ? t('quotes.compositionHpl')
                    : component.kind === 'FACADE'
                      ? t('quotes.compositionFacade')
                      : t('quotes.compositionInstallation')}
                </span>
                {component.includeInQuote &&
                positiveCustomerAmount(component.amount) ? (
                  <span className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {formatMoney(
                      positiveCustomerAmount(component.amount),
                      currency,
                    )}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {readinessText(component, t)}
              </p>
              {extraWarning ? (
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                  {extraWarning}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 text-sm text-slate-950 dark:text-slate-50">
        {composition.totals.grandTotal ? (
          <p className="font-semibold">
            {t('quotes.compositionGrandTotal')}:{' '}
            {formatMoney(
              composition.totals.grandTotal.amount,
              normalizeCurrency(composition.totals.grandTotal.currency),
            )}
          </p>
        ) : composition.totals.byCurrency.length > 1 ? (
          <div>
            <p className="font-semibold">{t('quotes.mixedCurrencyHint')}</p>
            {composition.totals.byCurrency.map((row) => (
              <p key={row.currency}>
                {formatMoney(row.amount, normalizeCurrency(row.currency))}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      {composition.staleAcknowledgementRequired ? (
        <label className="mt-3 flex items-start gap-2 text-sm text-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            className="mt-1"
            checked={acknowledgeStale}
            onChange={(event) => onAcknowledgeStaleChange(event.target.checked)}
          />
          <span>{t('quotes.compositionStaleAck')}</span>
        </label>
      ) : null}
    </section>
  );
}
