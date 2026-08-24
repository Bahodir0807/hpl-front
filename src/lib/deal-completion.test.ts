import { describe, expect, it } from 'vitest';
import {
  isActiveOperationalDeal,
  isCommerciallyWon,
  isOperationallyCompleted,
} from './deal-completion';

describe('deal operational completion', () => {
  it('treats WON without completedAt as commercially won, not operationally complete', () => {
    const deal = { stage: 'WON', completedAt: null };
    expect(isCommerciallyWon(deal)).toBe(true);
    expect(isOperationallyCompleted(deal)).toBe(false);
    expect(isActiveOperationalDeal(deal)).toBe(true);
  });

  it('shows a completed state only when completedAt is set', () => {
    const deal = { stage: 'WON', completedAt: '2026-08-20T10:00:00.000Z' };
    expect(isCommerciallyWon(deal)).toBe(true);
    expect(isOperationallyCompleted(deal)).toBe(true);
    expect(isActiveOperationalDeal(deal)).toBe(false);
  });
});
