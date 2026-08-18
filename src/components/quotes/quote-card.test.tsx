import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Quote } from '@/types/hpl';
import { QuoteCard } from './quote-card';

const quote: Quote = {
  id: '11111111-2222-3333-4444-555555555555',
  leadId: 'lead-1',
  managerId: 'manager-1',
  status: 'approved',
  displayCurrency: 'USD',
  totalAmount: '2500',
  validUntil: '2026-09-01T00:00:00.000Z',
  createdAt: '2026-08-19T10:00:00.000Z',
  updatedAt: '2026-08-19T10:00:00.000Z',
  items: [
    {
      id: 'item-1',
      panelTypeName: 'Интерьерная панель',
      panelSizeName: '1220 × 2440 мм',
      areaM2: '2.9768',
      requiredAreaM2: '20',
      sheetsCount: 8,
      pricePerM2: '100',
      pricePerSheet: '297.68',
      totalPrice: '2381.44',
    },
  ],
};

describe('QuoteCard', () => {
  it('renders canonical status and snapshot without inventing sensitive fields', () => {
    render(
      <QuoteCard
        quote={quote}
        currentUserId="viewer-1"
        permissions={[]}
        onSend={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onClientAccept={vi.fn()}
        onConvert={vi.fn()}
      />,
    );

    expect(screen.getByText('КП · 11111111')).toBeInTheDocument();
    expect(screen.getByText('Согласовано')).toBeInTheDocument();
    expect(screen.getByText('Интерьерная панель', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText('Цена закупки за м²')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Создать сделку' })).not.toBeInTheDocument();
  });
});
