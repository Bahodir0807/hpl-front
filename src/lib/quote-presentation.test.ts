import { describe, expect, it } from 'vitest';
import type { Quote, QuoteStatus } from '@/types/hpl';
import {
  getQuoteActions,
  getQuoteItemDetails,
  normalizeRejectionReason,
  quoteStatusLabels,
} from './quote-presentation';

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: '11111111-2222-3333-4444-555555555555',
    leadId: 'lead-1',
    managerId: 'manager-1',
    status: 'draft',
    items: [],
    totalAmount: '1000',
    createdAt: '2026-08-19T10:00:00.000Z',
    updatedAt: '2026-08-19T10:00:00.000Z',
    ...overrides,
  };
}

describe('quote presentation', () => {
  it('maps every persisted status to the canonical Russian label', () => {
    const statuses: QuoteStatus[] = [
      'draft',
      'sent',
      'approved',
      'rejected',
      'converted',
    ];

    expect(statuses.map((status) => quoteStatusLabels[status])).toEqual([
      'Черновик',
      'Отправлено',
      'Согласовано',
      'Отклонено',
      'Конвертировано',
    ]);
  });

  it('allows the owner to send a draft with quotes:update', () => {
    expect(
      getQuoteActions({
        quote: quote(),
        currentUserId: 'manager-1',
        permissions: ['quotes:update'],
      }),
    ).toEqual(['send']);
  });

  it('allows a manager to reject sent Quote without granting approval', () => {
    expect(
      getQuoteActions({
        quote: quote({ status: 'sent' }),
        currentUserId: 'manager-1',
        permissions: ['quotes:update'],
      }),
    ).toEqual(['reject']);
  });

  it('allows an authorized read-all user to approve or reject a sent Quote', () => {
    expect(
      getQuoteActions({
        quote: quote({ status: 'sent' }),
        currentUserId: 'head-1',
        permissions: ['quotes:update', 'quotes:read_all', 'quotes:approve'],
      }),
    ).toEqual(['approve', 'reject']);
  });

  it('keeps client acceptance distinct from approval and conversion', () => {
    expect(
      getQuoteActions({
        quote: quote({ status: 'approved' }),
        currentUserId: 'manager-1',
        permissions: ['quotes:update', 'quotes:client_accept'],
      }),
    ).toEqual(['client-accept', 'convert']);
  });

  it('hides conversion when a known lead requirement blocks it', () => {
    expect(
      getQuoteActions({
        quote: quote({ status: 'approved' }),
        currentUserId: 'manager-1',
        permissions: ['quotes:update', 'quotes:client_accept'],
        conversionAllowed: false,
      }),
    ).toEqual(['client-accept']);
  });

  it('does not expose conversion again for a converted Quote', () => {
    expect(
      getQuoteActions({
        quote: quote({
          status: 'converted',
          dealId: 'deal-1',
          clientAcceptedAt: '2026-08-20T10:00:00.000Z',
        }),
        currentUserId: 'manager-1',
        permissions: ['quotes:update', 'quotes:client_accept'],
      }),
    ).toEqual([]);
  });

  it('requires a non-empty rejection reason and trims valid input', () => {
    expect(normalizeRejectionReason('   ')).toBeNull();
    expect(normalizeRejectionReason('  Бюджет не согласован  ')).toBe(
      'Бюджет не согласован',
    );
  });

  it('omits purchase-sensitive price details when the API did not provide them', () => {
    const details = getQuoteItemDetails({
      id: 'item-1',
      areaM2: '2.9768',
      pricePerSheet: '100',
      totalPrice: '200',
    });

    expect(details.map((detail) => detail.label)).not.toContain(
      'Цена закупки за м²',
    );
  });
});
