import { describe, expect, it } from 'vitest';
import type { Quote, QuoteStatus } from '@/types/hpl';
import {
  getQuoteActions,
  getQuoteItemDetails,
  normalizeRejectionReason,
  quoteItemGroupTitle,
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

  it('allows the owner to send only a finalized draft with a persisted PDF', () => {
    expect(
      getQuoteActions({
        quote: quote(),
        currentUserId: 'manager-1',
        permissions: ['quotes:update'],
      }),
    ).toEqual([]);
    expect(
      getQuoteActions({
        quote: quote({
          finalizedAt: '2026-08-20T10:00:00.000Z',
          pdfFileId: 'file-1',
        }),
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

  it('keeps manager client acceptance distinct from HEAD conversion', () => {
    expect(
      getQuoteActions({
        quote: quote({ status: 'approved' }),
        currentUserId: 'manager-1',
        permissions: ['quotes:update', 'quotes:client_accept'],
      }),
    ).toEqual(['client-accept']);

    expect(
      getQuoteActions({
        quote: quote({ status: 'approved' }),
        currentUserId: 'head-1',
        permissions: ['quotes:update', 'quotes:read_all', 'quotes:approve'],
      }),
    ).toEqual(['convert']);
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

  it('displays canonical HPL type and decimal thickness from Quote snapshots', () => {
    const details = getQuoteItemDetails({
      id: 'item-2',
      application: 'EXTERIOR_WITH_UV',
      panelTypeCode: 'exterior_with_uv',
      panelSizeName: '1220 × 2440 мм',
      thicknessMm: '2.9',
      qualityClassName: 'Премиум',
      supplierName: 'Тианран',
      areaM2: '2.9768',
      pricePerSheet: '100',
      totalPrice: '200',
    });

    expect(details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Тип HPL', value: 'Exterior с УФ' }),
        expect.objectContaining({ label: 'Размер', value: '1220 × 2440 мм' }),
        expect.objectContaining({ label: 'Толщина', value: '2.9 мм' }),
        expect.objectContaining({ label: 'Класс', value: 'Премиум' }),
        expect.objectContaining({ label: 'Поставщик', value: 'Тианран' }),
      ]),
    );
  });

  it('renders wuya as Вуя and economy as Эконом on quote details', () => {
    const details = getQuoteItemDetails({
      id: 'item-3',
      application: 'FURNITURE',
      panelTypeCode: 'furniture',
      thicknessMm: '2.9',
      qualityClassCode: 'economy',
      qualityClassName: 'Economy',
      supplierCode: 'wuya',
      supplierName: 'Wuya',
      areaM2: '2.9768',
      pricePerSheet: '100',
      totalPrice: '200',
    });

    expect(details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Класс', value: 'Эконом' }),
        expect.objectContaining({ label: 'Поставщик', value: 'Вуя' }),
      ]),
    );
    expect(details.map((detail) => String(detail.value)).join(' ')).not.toContain(
      'Буя',
    );
    expect(details.map((detail) => String(detail.value)).join(' ')).not.toContain(
      'wuya',
    );
  });

  it('renders historical snapshot fields instead of live catalog values', () => {
    const details = getQuoteItemDetails({
      id: 'item-snap',
      areaM2: '10',
      colorCode: 'W100',
      colorName: 'White Oak',
      coating: 'PE',
      texture: 'Wood',
      customTypeDescription: 'Спец. лаборатория',
      customWidthMm: 1230,
      customHeightMm: 3050,
      sheetsCount: 4,
    });

    expect(details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Декор', value: 'W100 · White Oak' }),
        expect.objectContaining({ label: 'Покрытие', value: 'PE' }),
        expect.objectContaining({ label: 'Текстура', value: 'Wood' }),
        expect.objectContaining({
          label: 'Нестандартный тип',
          value: 'Спец. лаборатория',
        }),
        expect.objectContaining({
          label: 'Нестандартный размер',
          value: '1230 × 3050 мм',
        }),
        expect.objectContaining({ label: 'Листы', value: 4 }),
      ]),
    );
  });

  it('reads the quote group title from calculationGroupTitle', () => {
    expect(
      quoteItemGroupTitle({
        id: 'item-1',
        areaM2: '10',
        calculationGroupTitle: 'Расчёт №2',
        calculationTitle: 'legacy',
      }),
    ).toBe('Расчёт №2');
  });

  it('does not show purchase price on a historical Quote snapshot', () => {
    const details = getQuoteItemDetails({
      id: 'item-purchase',
      areaM2: '10',
      supplierPricePerM2: '80',
      pricePerM2: '120',
      priceApprovedAt: '2026-08-21T10:00:00.000Z',
    });

    expect(details.map((detail) => detail.label).join(' ')).not.toContain(
      'закупки',
    );
  });
});
