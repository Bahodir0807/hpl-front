import { describe, expect, it } from 'vitest';
import { formatDate, toDateInputValue } from './format';
import {
  buildQuoteCommercialTermsPayload,
  canEditQuoteClientFacingTerms,
  canEditQuoteCommercialNote,
  canMutateQuoteDraftClientTerms,
  DAY_RANGE_ORDER_MESSAGE,
  DAY_RANGE_REQUIRED_MESSAGE,
  DELIVERY_REQUIRED_MESSAGE,
  defaultQuoteValidUntilInput,
  hasCompleteQuoteClientTerms,
  localDateInputValue,
  PRODUCTION_REQUIRED_MESSAGE,
  quoteAutomaticDate,
  quoteCustomerDocumentIssues,
  validateDayRange,
  validateQuoteCommercialTerms,
  VALID_UNTIL_REQUIRED_MESSAGE,
} from './quote-commercial-terms';

const HEAD = [
  'quotes:create',
  'quotes:update',
  'quotes:read_all',
  'quotes:approve',
  'leads:commercial_qualify',
];
const MANAGER = ['quotes:create', 'quotes:update', 'quotes:client_accept'];
const DIRECTOR = ['quotes:read_all', 'calculations:read_all'];

describe('quote commercial terms', () => {
  it('lets only HEAD edit client-facing Quote table terms', () => {
    expect(canEditQuoteClientFacingTerms(HEAD)).toBe(true);
    expect(canEditQuoteClientFacingTerms(MANAGER)).toBe(false);
    expect(canEditQuoteClientFacingTerms(DIRECTOR)).toBe(false);
    expect(canEditQuoteClientFacingTerms([])).toBe(false);
  });

  it('lets only HEAD write Quote Примечание', () => {
    expect(canEditQuoteCommercialNote(MANAGER)).toBe(false);
    expect(canEditQuoteCommercialNote(HEAD)).toBe(true);
    expect(canEditQuoteCommercialNote(DIRECTOR)).toBe(false);
  });

  it('allows draft client-term mutation only for HEAD', () => {
    expect(
      canMutateQuoteDraftClientTerms({
        permissions: HEAD,
        currentUserId: 'head-1',
        managerId: 'manager-1',
        status: 'draft',
      }),
    ).toBe(true);
    expect(
      canMutateQuoteDraftClientTerms({
        permissions: MANAGER,
        currentUserId: 'manager-1',
        managerId: 'manager-1',
        status: 'draft',
      }),
    ).toBe(false);
    expect(
      canMutateQuoteDraftClientTerms({
        permissions: MANAGER,
        currentUserId: 'manager-1',
        managerId: 'manager-1',
        status: 'sent',
      }),
    ).toBe(false);
    expect(
      canMutateQuoteDraftClientTerms({
        permissions: DIRECTOR,
        currentUserId: 'director-1',
        managerId: 'manager-1',
        status: 'draft',
      }),
    ).toBe(false);
    expect(
      canMutateQuoteDraftClientTerms({
        permissions: HEAD,
        currentUserId: 'head-1',
        managerId: 'manager-1',
        status: 'draft',
        finalizedAt: '2026-08-21T12:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('renders the automatic Quote date from createdAt', () => {
    const now = new Date(2026, 7, 20, 15, 30);
    expect(localDateInputValue(now)).toBe(toDateInputValue(now));
    expect(defaultQuoteValidUntilInput(now)).toBe('2026-09-03');
    expect(
      quoteAutomaticDate({
        createdAt: '2026-08-20T10:00:00.000Z',
        documentDate: '2020-01-01T00:00:00.000Z',
      }),
    ).toBe(formatDate('2026-08-20T10:00:00.000Z'));
  });

  it('validates production and delivery ranges', () => {
    expect(validateDayRange('10', '20')).toBeNull();
    expect(validateDayRange('', '20')).toBe(DAY_RANGE_REQUIRED_MESSAGE);
    expect(validateDayRange('0', '20')).toBe(DAY_RANGE_REQUIRED_MESSAGE);
    expect(validateDayRange('20', '10')).toBe(DAY_RANGE_ORDER_MESSAGE);
  });

  it('requires production and delivery text terms before a Quote is customer-ready', () => {
    expect(
      validateQuoteCommercialTerms({
        productionTerms: '',
        deliveryTerms: 'Ориентировочно 4 недели после утверждения декора',
        validUntil: '2026-08-20',
      }),
    ).toBe(PRODUCTION_REQUIRED_MESSAGE);
    expect(
      validateQuoteCommercialTerms({
        productionTerms: '15–20 рабочих дней',
        deliveryTerms: '',
        validUntil: '2026-08-20',
      }),
    ).toBe(DELIVERY_REQUIRED_MESSAGE);
    expect(
      hasCompleteQuoteClientTerms({
        productionDaysFrom: null,
        productionDaysTo: 20,
        deliveryDaysFrom: 14,
        deliveryDaysTo: 25,
      }),
    ).toBe(false);
    expect(
      quoteCustomerDocumentIssues({
        productionDaysFrom: 10,
        productionDaysTo: 20,
        deliveryDaysFrom: null,
        deliveryDaysTo: null,
      }),
    ).toEqual([DELIVERY_REQUIRED_MESSAGE]);
    expect(
      hasCompleteQuoteClientTerms({
        productionTerms: '15–20 рабочих дней',
        deliveryTerms: 'Ориентировочно 4 недели после утверждения декора',
      }),
    ).toBe(true);
    expect(validateDayRange('', '20')).toBe(DAY_RANGE_REQUIRED_MESSAGE);
  });

  it('requires validity before conversion and does not require a document date', () => {
    expect(
      validateQuoteCommercialTerms({
        productionTerms: '15–20 рабочих дней',
        deliveryTerms: 'Ориентировочно 4 недели после утверждения декора',
        validUntil: '',
        commercialNote: '',
      }),
    ).toBe(VALID_UNTIL_REQUIRED_MESSAGE);
    expect(
      validateQuoteCommercialTerms({
        productionTerms: '15–20 рабочих дней',
        deliveryTerms: 'Ориентировочно 4 недели после утверждения декора',
        validUntil: '2026-08-20',
        commercialNote: '',
      }),
    ).toBeNull();
  });

  it('builds a terms payload from text values without numeric duplicates', () => {
    const payload = buildQuoteCommercialTermsPayload({
      productionTerms: '15–20 рабочих дней',
      deliveryTerms: 'Ориентировочно 4 недели после утверждения декора',
      validUntil: '2026-08-20',
      commercialNote: 'Цена указана с учётом 1 контейнера CIP Tashkent.',
    });

    expect(payload.productionTerms).toBe('15–20 рабочих дней');
    expect(payload.deliveryTerms).toBe(
      'Ориентировочно 4 недели после утверждения декора',
    );
    expect(payload).not.toHaveProperty('productionDaysFrom');
    expect(payload).not.toHaveProperty('productionDaysTo');
    expect(payload).not.toHaveProperty('deliveryDaysFrom');
    expect(payload).not.toHaveProperty('deliveryDaysTo');
    expect(payload.validUntil).toBe(new Date(2026, 7, 20).toISOString());
    expect(payload).not.toHaveProperty('documentDate');
    expect(payload).not.toHaveProperty('commercialNote');
  });

  it('does not accept numeric day ranges as the write path', () => {
    expect(
      validateQuoteCommercialTerms({
        productionDaysFrom: '10',
        productionDaysTo: '20',
        deliveryDaysFrom: '14',
        deliveryDaysTo: '25',
        validUntil: '2026-08-20',
      }),
    ).toBe(PRODUCTION_REQUIRED_MESSAGE);

    const payload = buildQuoteCommercialTermsPayload({
      productionDaysFrom: '10',
      productionDaysTo: '20',
      deliveryDaysFrom: '14',
      deliveryDaysTo: '25',
      validUntil: '2026-08-20',
    });
    expect(payload).not.toHaveProperty('productionDaysFrom');
    expect(payload).not.toHaveProperty('productionDaysTo');
    expect(payload).not.toHaveProperty('deliveryDaysFrom');
    expect(payload).not.toHaveProperty('deliveryDaysTo');
    expect(payload.productionTerms).toBeUndefined();
    expect(payload.deliveryTerms).toBeUndefined();
  });

  it('includes Примечание only when MANAGER explicitly opts in', () => {
    const payload = buildQuoteCommercialTermsPayload(
      {
        productionTerms: '15–20 рабочих дней',
        deliveryTerms: 'Ориентировочно 4 недели после утверждения декора',
        validUntil: '2026-08-20',
        commercialNote: 'CIP Tashkent',
      },
      { includeNote: true },
    );
    expect(payload.commercialNote).toBe('CIP Tashkent');
    const cleared = buildQuoteCommercialTermsPayload(
      {
        productionTerms: '15–20 рабочих дней',
        deliveryTerms: 'Ориентировочно 4 недели после утверждения декора',
        validUntil: '2026-08-20',
        commercialNote: '   ',
      },
      { includeNote: true },
    );
    expect(cleared.commercialNote).toBe('');
  });
});
