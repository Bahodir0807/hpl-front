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
  PRICE: 'Цена',
  NO_STOCK: 'Нет в наличии',
  LEAD_TIME: 'Срок поставки',
  COMPETITOR: 'Конкурент',
  QUALITY: 'Качество',
  SIZE: 'Размер',
  CLIENT_CANCELLED: 'Клиент отказался',
  OTHER: 'Другое',
};

export const OTHER_LOSS_COMMENT_REQUIRED_MESSAGE =
  'Для причины «Другое» нужен комментарий.';

export function lossReasonLabel(reason?: string | null): string {
  if (!reason) {
    return '—';
  }

  if (reason in lossReasonLabels) {
    return lossReasonLabels[reason as LossReason];
  }

  return reason;
}

export function isOtherLossReason(reason?: string | null): boolean {
  return reason === 'OTHER';
}

export function validateLossPayload(input: {
  reason: LossReason;
  comment?: string;
}): string | null {
  if (input.reason === 'OTHER' && !input.comment?.trim()) {
    return OTHER_LOSS_COMMENT_REQUIRED_MESSAGE;
  }

  return null;
}
