import { describe, expect, it } from 'vitest';
import type { Quote } from '@/types/hpl';
import {
  canFinalizeQuoteItems,
  buildApprovedPricingPayload,
  canDownloadQuoteDocument,
  isQuoteFinalized,
  isQuotePriceApproved,
  quoteUsesMixedCurrencies,
  unapprovedQuoteItemIds,
  validateApprovedPricingItem,
} from './quote-pricing';

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    leadId: 'lead-1',
    managerId: 'manager-1',
    status: 'draft',
    items: [],
    totalAmount: '1000',
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('quote approved pricing', () => {
  it('serializes only CNY purchase-price input for backend calculation', () => {
    expect(
      buildApprovedPricingPayload([
        { id: 'a', purchasePricePerM2Cny: '80,25' },
      ]),
    ).toEqual({
      items: [{ id: 'a', purchasePricePerM2Cny: '80.25' }],
    });
    expect(
      validateApprovedPricingItem({ purchasePricePerM2Cny: '0' }),
    ).toContain('CNY/м²');
  });

  it('does not treat a numeric reference price as approved', () => {
    expect(
      isQuotePriceApproved({
        priceApprovedAt: null,
      }),
    ).toBe(false);
    expect(
      isQuotePriceApproved({
        priceApprovedAt: '2026-08-21T10:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('detects mixed USD/UZS without combining totals', () => {
    const mixed = quote({
      items: [
        {
          id: 'a',
          areaM2: '10',
          pricePerM2: '300',
          currencyCode: 'USD',
          priceApprovedAt: '2026-08-21T10:00:00.000Z',
        },
        {
          id: 'b',
          areaM2: '8',
          pricePerM2: '4000000',
          currencyCode: 'UZS',
          priceApprovedAt: '2026-08-21T10:00:00.000Z',
        },
      ],
    });

    expect(quoteUsesMixedCurrencies(mixed)).toBe(true);
    expect(canFinalizeQuoteItems(mixed)).toBe(true);
  });

  it('blocks finalize while any required item is unapproved', () => {
    const draft = quote({
      items: [
        {
          id: 'a',
          areaM2: '10',
          pricePerM2: '300',
          currencyCode: 'USD',
          priceApprovedAt: null,
        },
      ],
    });

    expect(canFinalizeQuoteItems(draft)).toBe(false);
    expect(unapprovedQuoteItemIds(draft)).toEqual(['a']);
  });

  it('locks a quote when finalizedAt is set', () => {
    expect(isQuoteFinalized(quote({ finalizedAt: null }))).toBe(false);
    expect(
      isQuoteFinalized(quote({ finalizedAt: '2026-08-21T12:00:00.000Z' })),
    ).toBe(true);
  });

  it('lets HEAD preview documents before finalize, but not a manager', () => {
    const draft = quote({ finalizedAt: null });
    expect(canDownloadQuoteDocument(draft, ['quotes:read'])).toBe(false);
    expect(canDownloadQuoteDocument(draft, ['quotes:approve'])).toBe(true);
    expect(
      canDownloadQuoteDocument(
        quote({ finalizedAt: '2026-08-21T12:00:00.000Z' }),
        ['quotes:read'],
      ),
    ).toBe(true);
  });
});
