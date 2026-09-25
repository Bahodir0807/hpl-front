'use client';

import { useI18n } from '@/i18n/provider';
import { formatDateTime } from '@/lib/format';
import type {
  ExecutionComponentKind,
  ExecutionHandoffView,
  LeadExecutionView,
} from '@/hooks/use-quotes';

const KINDS: ExecutionComponentKind[] = ['HPL', 'FACADE', 'INSTALLATION'];

const KIND_LABEL: Record<ExecutionComponentKind, 'quotes.componentHpl' | 'quotes.componentFacade' | 'quotes.componentInstallation'> = {
  HPL: 'quotes.componentHpl',
  FACADE: 'quotes.componentFacade',
  INSTALLATION: 'quotes.componentInstallation',
};

function statusLabel(
  status: ExecutionHandoffView['components'][number]['status'],
  t: (key: string) => string,
): string {
  if (status === 'IN_PROGRESS') return t('quotes.executionInProgress');
  if (status === 'BLOCKED') return t('quotes.executionBlocked');
  if (status === 'COMPLETED') return t('quotes.executionCompleted');
  return t('quotes.executionPending');
}

export function ExecutionHandoffPanel({
  view,
}: {
  view: LeadExecutionView | undefined;
}) {
  const { t } = useI18n();
  const active = view?.active ?? null;

  return (
    <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
        {t('quotes.executionTitle')}
      </h3>
      {!active ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {t('quotes.executionEmpty')}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm font-medium text-slate-950 dark:text-slate-50">
            {t('quotes.executionAcceptedQuote', { version: active.quoteVersion })}
            <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-300">
              {t('quotes.executionCurrent')}
            </span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('quotes.acceptedState')} · {formatDateTime(active.acceptedAt)} ·{' '}
            {t('quotes.acceptedBy', { name: active.acceptedBy.name })}
          </p>
          {active.acceptanceNote ? (
            <p className="text-sm text-slate-700 dark:text-slate-200">{active.acceptanceNote}</p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-3">
            {KINDS.map((kind) => {
              const component = active.components.find((item) => item.kind === kind);
              return (
                <article
                  key={kind}
                  className="rounded border border-slate-200 p-3 dark:border-slate-700"
                >
                  <h4 className="text-sm font-medium text-slate-950 dark:text-slate-50">
                    {t(KIND_LABEL[kind])}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {component ? t('quotes.executionIncluded') : t('quotes.executionNotIncluded')}
                  </p>
                  {component ? (
                    <>
                      <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                        {statusLabel(component.status, t)}
                        {component.customerAmount
                          ? ` · ${component.customerAmount} ${component.currency ?? ''}`
                          : ''}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {component.sourceRevision != null
                          ? `rev ${component.sourceRevision}`
                          : `v${active.quoteVersion}`}
                        {component.technicalRevision != null
                          ? ` · t${component.technicalRevision}`
                          : ''}
                      </p>
                      {component.changedAfterAcceptance ? (
                        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                          {t('quotes.executionChanged')}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </article>
              );
            })}
          </div>
          {view && view.history.some((item) => !item.active) ? (
            <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {view.history
                .filter((item) => !item.active)
                .map((item) => (
                  <li key={item.id}>
                    v{item.quoteVersion} · {formatDateTime(item.acceptedAt)} ·{' '}
                    {t('quotes.executionSuperseded', {
                      version: active.quoteVersion,
                    })}
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      )}
    </section>
  );
}
