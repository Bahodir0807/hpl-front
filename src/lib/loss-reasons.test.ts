import { describe, expect, it } from 'vitest';
import {
  LOSS_REASONS,
  OTHER_LOSS_COMMENT_REQUIRED_MESSAGE,
  lossReasonLabels,
  validateLossPayload,
} from './loss-reasons';

describe('structured loss reasons', () => {
  it('exposes all backend loss reasons with Russian labels', () => {
    expect(LOSS_REASONS).toEqual([
      'PRICE',
      'NO_STOCK',
      'LEAD_TIME',
      'COMPETITOR',
      'QUALITY',
      'SIZE',
      'CLIENT_CANCELLED',
      'OTHER',
    ]);
    expect(lossReasonLabels.PRICE).toBe('Цена');
    expect(lossReasonLabels.NO_STOCK).toBe('Нет в наличии');
    expect(lossReasonLabels.LEAD_TIME).toBe('Срок поставки');
    expect(lossReasonLabels.OTHER).toBe('Другое');
  });

  it('requires a comment only for OTHER', () => {
    expect(validateLossPayload({ reason: 'PRICE' })).toBeNull();
    expect(validateLossPayload({ reason: 'OTHER' })).toBe(
      OTHER_LOSS_COMMENT_REQUIRED_MESSAGE,
    );
    expect(
      validateLossPayload({ reason: 'OTHER', comment: 'Клиент ушёл к другому' }),
    ).toBeNull();
  });
});
