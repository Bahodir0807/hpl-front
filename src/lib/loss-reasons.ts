import { getActiveMessages } from '@/i18n/active-messages';
import { ru } from '@/i18n/ru';
import type { Messages } from '@/i18n/types';

export const LOSS_REASONS = [
  'PRICE',
  'NO_STOCK',
  'LEAD_TIME',
  'COMPETITOR',
  'QUALITY',
  'SIZE',
  'CLIENT_CANCELLED',
  'OTHER',
] as const;

export type LossReason = (typeof LOSS_REASONS)[number];

export const lossReasonLabels: Record<LossReason, string> = {
  PRICE: ru.lossReasons.PRICE,
  NO_STOCK: ru.lossReasons.NO_STOCK,
  LEAD_TIME: ru.lossReasons.LEAD_TIME,
  COMPETITOR: ru.lossReasons.COMPETITOR,
  QUALITY: ru.lossReasons.QUALITY,
  SIZE: ru.lossReasons.SIZE,
  CLIENT_CANCELLED: ru.lossReasons.CLIENT_CANCELLED,
  OTHER: ru.lossReasons.OTHER,
};

export const OTHER_LOSS_COMMENT_REQUIRED_MESSAGE =
  ru.lossReasons.otherCommentRequired;

export function lossReasonLabel(
  reason?: string | null,
  messages: Messages = getActiveMessages(),
): string {
  if (!reason) {
    return messages.common.dash;
  }

  if (reason in messages.lossReasons && reason !== 'otherCommentRequired') {
    return messages.lossReasons[reason as LossReason];
  }

  return reason;
}

export function isOtherLossReason(reason?: string | null): boolean {
  return reason === 'OTHER';
}

export function validateLossPayload(
  input: {
    reason: LossReason;
    comment?: string;
  },
  messages: Messages = getActiveMessages(),
): string | null {
  if (input.reason === 'OTHER' && !input.comment?.trim()) {
    return messages.lossReasons.otherCommentRequired;
  }

  return null;
}
