'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  LOSS_REASONS,
  type LossReason,
  isOtherLossReason,
  validateLossPayload,
} from '@/lib/loss-reasons';
import { useI18n } from '@/i18n/provider';
import { useLabelMaps } from '@/i18n/use-label-maps';

type LoseOpportunityModalProps = {
  isOpen: boolean;
  title: string;
  entityLabel: string;
  pending?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: { reason: LossReason; comment?: string }) => Promise<void>;
};

export function LoseOpportunityModal(props: LoseOpportunityModalProps) {
  if (!props.isOpen) {
    return null;
  }

  return <LoseOpportunityModalContent {...props} />;
}

function LoseOpportunityModalContent({
  title,
  entityLabel,
  pending = false,
  error,
  onClose,
  onSubmit,
}: LoseOpportunityModalProps) {
  const { t, messages } = useI18n();
  const { lossReasonLabels } = useLabelMaps();
  const [reason, setReason] = useState<LossReason>('PRICE');
  const [comment, setComment] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const isDeal =
    entityLabel === 'сделку' ||
    entityLabel === 'deal' ||
    entityLabel === t('deals.entityLabel');

  const save = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const payload = {
      reason,
      comment: comment.trim() || undefined,
    };
    const invalid = validateLossPayload(
      {
        reason: payload.reason,
        comment: payload.comment,
      },
      messages,
    );
    if (invalid) {
      setLocalError(invalid);
      return;
    }

    setLocalError(null);
    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">
          {isDeal
            ? t('opportunities.loseTitleDeal')
            : t('opportunities.loseTitleLead')}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{title}</p>

        <form className="mt-4 space-y-4" onSubmit={(event) => void save(event)}>
          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">{t('common.reason')}</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as LossReason)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              {LOSS_REASONS.map((item) => (
                <option key={item} value={item}>
                  {lossReasonLabels[item]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">
              {t('common.comment')}
              {isOtherLossReason(reason) ? t('common.commentRequiredSuffix') : ''}
            </span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          {localError || error ? (
            <p className="text-sm text-red-600">{localError ?? error}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? t('common.saving') : t('opportunities.loseSubmit')}
            </Button>
          </div>
        </form>
        {isOtherLossReason(reason) ? (
          <p className="mt-2 text-xs text-slate-500">
            {messages.lossReasons.otherCommentRequired}
          </p>
        ) : null}
      </div>
    </div>
  );
}
