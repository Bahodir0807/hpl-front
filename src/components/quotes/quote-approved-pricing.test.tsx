import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Quote, QuotePricingPreview } from '@/types/hpl';
import { QuoteApprovedPricing } from './quote-approved-pricing';
import {
  APPROVE_PRICES_LABEL,
  CALCULATE_PRICES_LABEL,
  FINALIZE_QUOTE_LABEL,
  PRICE_NOT_APPROVED_LABEL,
} from '@/lib/quote-pricing';

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    leadId: 'lead-1',
    managerId: 'head-1',
    status: 'draft',
    items: [
      {
        id: 'item-1',
        name: 'Интерьер',
        supplierName: 'Wuya',
        areaM2: '10',
        supplierPricePerM2: '80',
        pricePerM2: '16',
        currencyCode: 'USD',
        priceApprovedAt: null,
      },
      {
        id: 'item-2',
        name: 'Фасад',
        supplierName: 'Wuya',
        areaM2: '8',
        supplierPricePerM2: null,
        pricePerM2: null,
        currencyCode: null,
        priceApprovedAt: null,
      },
    ],
    totalAmount: '0',
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
    ...overrides,
  };
}

const preview: QuotePricingPreview = {
  cnyUsdRate: '0.1',
  sellingCoefficient: '2',
  currencyCode: 'USD',
  items: [
    {
      id: 'item-1',
      purchasePricePerM2Cny: '80',
      pricePerM2: '16',
      pricePerSheet: '160',
      totalPrice: '160',
    },
    {
      id: 'item-2',
      purchasePricePerM2Cny: '120',
      pricePerM2: '24',
      pricePerSheet: '192',
      totalPrice: '192',
    },
  ],
};

describe('QuoteApprovedPricing', () => {
  it('does not expose the CNY purchase-price input to MANAGER', () => {
    render(
      <QuoteApprovedPricing
        quote={quote()}
        canApprove={false}
        canFinalize={false}
        onPreview={vi.fn().mockResolvedValue(preview)}
        onApprove={vi.fn()}
        onFinalize={vi.fn()}
      />,
    );
    expect(
      screen.queryByLabelText('Закупочная цена, CNY/м² Интерьер'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: CALCULATE_PRICES_LABEL })).not.toBeInTheDocument();
  });

  it('shows server reference pricing without treating it as approved', () => {
    render(
      <QuoteApprovedPricing
        quote={quote()}
        canApprove
        canFinalize
        onPreview={vi.fn().mockResolvedValue(preview)}
        onApprove={vi.fn()}
        onFinalize={vi.fn()}
      />,
    );

    expect(screen.getAllByText(PRICE_NOT_APPROVED_LABEL)).toHaveLength(2);
    expect(screen.getByText('Закупочная цена, CNY/м²')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: FINALIZE_QUOTE_LABEL })).toBeDisabled();
  });

  it('previews distinct CNY inputs on backend before explicit approval', async () => {
    const onPreview = vi.fn().mockResolvedValue(preview);
    const onApprove = vi.fn();
    render(
      <QuoteApprovedPricing
        quote={quote()}
        canApprove
        canFinalize
        onPreview={onPreview}
        onApprove={onApprove}
        onFinalize={vi.fn()}
      />,
    );

    await userEvent.type(
      screen.getByLabelText('Закупочная цена, CNY/м² Фасад'),
      '120',
    );
    await userEvent.click(screen.getByRole('button', { name: CALCULATE_PRICES_LABEL }));

    expect(onPreview).toHaveBeenCalledWith([
      { id: 'item-1', purchasePricePerM2Cny: '80' },
      { id: 'item-2', purchasePricePerM2Cny: '120' },
    ]);
    expect(screen.getByText(/^24,00/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: APPROVE_PRICES_LABEL }));
    expect(onApprove).toHaveBeenCalledWith([
      { id: 'item-1', purchasePricePerM2Cny: '80' },
      { id: 'item-2', purchasePricePerM2Cny: '120' },
    ]);
  });

  it('requires a positive CNY purchase price for every item', async () => {
    const onPreview = vi.fn().mockResolvedValue(preview);
    render(
      <QuoteApprovedPricing
        quote={quote()}
        canApprove
        canFinalize
        onPreview={onPreview}
        onApprove={vi.fn()}
        onFinalize={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: CALCULATE_PRICES_LABEL }));
    expect(screen.getByText('Укажите закупочную цену CNY/м² больше 0')).toBeInTheDocument();
    expect(onPreview).not.toHaveBeenCalled();
  });

  it('highlights unapproved items after QUOTE_PRICE_NOT_APPROVED', () => {
    render(
      <QuoteApprovedPricing
        quote={quote()}
        canApprove
        canFinalize
        highlightUnapproved
        onPreview={vi.fn().mockResolvedValue(preview)}
        onApprove={vi.fn()}
        onFinalize={vi.fn()}
      />,
    );
    expect(screen.getByText('Интерьер').closest('tr')).toHaveClass('bg-red-50');
  });

  it('finalizes after all items have explicit approval', async () => {
    const onFinalize = vi.fn();
    render(
      <QuoteApprovedPricing
        quote={quote({
          items: [{
            id: 'item-1',
            name: 'Интерьер',
            areaM2: '10',
            supplierPricePerM2: '80',
            pricePerM2: '16',
            currencyCode: 'USD',
            priceApprovedAt: '2026-08-21T10:00:00.000Z',
          }],
        })}
        canApprove
        canFinalize
        onPreview={vi.fn().mockResolvedValue(preview)}
        onApprove={vi.fn()}
        onFinalize={onFinalize}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: FINALIZE_QUOTE_LABEL }));
    expect(onFinalize).toHaveBeenCalled();
  });

  it('keeps historical finalized pricing read-only', () => {
    render(
      <QuoteApprovedPricing
        quote={quote({ finalizedAt: '2026-08-21T12:00:00.000Z' })}
        canApprove
        canFinalize
        onPreview={vi.fn().mockResolvedValue(preview)}
        onApprove={vi.fn()}
        onFinalize={vi.fn()}
      />,
    );
    expect(screen.getByText('КП финализировано')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: CALCULATE_PRICES_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Закупочная цена, CNY/м² Интерьер')).not.toBeInTheDocument();
  });
});
