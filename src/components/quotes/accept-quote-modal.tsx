'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
import { formatDateTime } from '@/lib/format';
import type { Quote } from '@/types/hpl';

type AcceptQuoteModalProps = {
  quote: Quote;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (note: string) => Promise<void>;
};

export function AcceptQuoteModal({
  quote,
  isPending,
  onCancel,
  onSubmit,
}: AcceptQuoteModalProps) {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  const version = quote.versionNumber ?? 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/30 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accept-quote-title"
    >
      <div className="w-full max-w-lg rounded border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2
          id="accept-quote-title"
          className="text-base font-semibold text-slate-950 dark:text-slate-50"
        >
          {t('quotes.acceptTitle')}
        </h2>
        <p className="mt-2 text-sm font-medium text-slate-950 dark:text-slate-50">
          {t('quotes.acceptVersion', { version })}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('quotes.acceptIssued', {
            date: formatDateTime(quote.finalizedAt ?? quote.documentDate ?? quote.createdAt),
          })}
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            {t('quotes.acceptNote')}
          </span>
          <textarea
            rows={3}
            maxLength={2000}
            value={note}
            disabled={isPending}
            onChange={(event) => setNote(event.target.value)}
            className="w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-500 disabled:bg-slate-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50"
          />
        </label>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              void onSubmit(note.trim());
            }}
          >
            {isPending ? t('quotes.accepting') : t('quotes.acceptConfirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
