'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
import { normalizeRejectionReason } from '@/lib/quote-presentation';

type RejectQuoteModalProps = {
  quoteId: string;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

export function RejectQuoteModal({
  quoteId,
  isPending,
  onCancel,
  onSubmit,
}: RejectQuoteModalProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    const normalizedReason = normalizeRejectionReason(reason);
    if (!normalizedReason) {
      setValidationError(t('validation.rejectionRequired'));
      return;
    }

    setValidationError(null);
    try {
      await onSubmit(normalizedReason);
    } catch {
      // Mutation toast keeps the backend error visible while the dialog stays open.
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-quote-title"
    >
      <div className="w-full max-w-lg rounded border border-slate-200 bg-white p-5 shadow-sm">
        <h2 id="reject-quote-title" className="text-base font-semibold text-slate-950">
          {t('quotes.rejectTitle')}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {t('quotes.identifier', { id: quoteId })}
        </p>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            {t('quotes.rejectionReason')}
          </span>
          <textarea
            autoFocus
            rows={4}
            maxLength={1000}
            value={reason}
            disabled={isPending}
            onChange={(event) => {
              setReason(event.target.value);
              if (validationError) {
                setValidationError(null);
              }
            }}
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? 'reject-quote-error' : undefined}
            className="w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-500 disabled:bg-slate-50"
          />
        </label>
        {validationError ? (
          <p id="reject-quote-error" className="mt-1 text-sm text-red-600">
            {validationError}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="destructive" disabled={isPending} onClick={() => void submit()}>
            {isPending ? t('quotes.rejecting') : t('quotes.reject')}
          </Button>
        </div>
      </div>
    </div>
  );
}
