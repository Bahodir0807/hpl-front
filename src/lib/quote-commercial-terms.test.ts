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

  it('requires production and delivery before a Quote is customer-ready', () => {
    expect(
      validateQuoteCommercialTerms({
        productionDaysFrom: '',
        productionDaysTo: '',
        deliveryDaysFrom: '14',
        deliveryDaysTo: '25',
        validUntil: '2026-08-20',
      }),
    ).toBe(PRODUCTION_REQUIRED_MESSAGE);
    expect(
      validateQuoteCommercialTerms({
        productionDaysFrom: '10',
        productionDaysTo: '20',
        deliveryDaysFrom: '',
        deliveryDaysTo: '',
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
    expect(validateDayRange('', '20')).toBe(DAY_RANGE_REQUIRED_MESSAGE);
  });

  it('requires validity before conversion and does not require a document date', () => {
    expect(
      validateQuoteCommercialTerms({
        productionDaysFrom: '10',
        productionDaysTo: '20',
        deliveryDaysFrom: '14',
        deliveryDaysTo: '25',
        validUntil: '',
        commercialNote: '',
      }),
    ).toBe(VALID_UNTIL_REQUIRED_MESSAGE);
    expect(
      validateQuoteCommercialTerms({
        productionDaysFrom: '10',
        productionDaysTo: '20',
        deliveryDaysFrom: '14',
        deliveryDaysTo: '25',
        validUntil: '2026-08-20',
        commercialNote: '',
      }),
    ).toBeNull();
  });

  it('builds a convert payload without documentDate and without HEAD note', () => {
    const payload = buildQuoteCommercialTermsPayload({
      productionDaysFrom: '10',
      productionDaysTo: '20',
      deliveryDaysFrom: '14',
      deliveryDaysTo: '25',
      validUntil: '2026-08-20',
      commercialNote: 'Цена указана с учётом 1 контейнера CIP Tashkent.',
    });

    expect(payload.productionDaysFrom).toBe(10);
    expect(payload.productionDaysTo).toBe(20);
    expect(payload.deliveryDaysFrom).toBe(14);
    expect(payload.deliveryDaysTo).toBe(25);
    expect(payload.validUntil).toBe(new Date(2026, 7, 20).toISOString());
    expect(payload).not.toHaveProperty('documentDate');
    expect(payload).not.toHaveProperty('commercialNote');
  });

  it('includes Примечание only when MANAGER explicitly opts in', () => {
    const payload = buildQuoteCommercialTermsPayload(
      {
        productionDaysFrom: '10',
        productionDaysTo: '20',
        deliveryDaysFrom: '14',
        deliveryDaysTo: '25',
        validUntil: '2026-08-20',
        commercialNote: 'CIP Tashkent',
      },
      { includeNote: true },
    );
    expect(payload.commercialNote).toBe('CIP Tashkent');
    const cleared = buildQuoteCommercialTermsPayload(
      {
        productionDaysFrom: '10',
        productionDaysTo: '20',
        deliveryDaysFrom: '14',
        deliveryDaysTo: '25',
        validUntil: '2026-08-20',
        commercialNote: '   ',
      },
      { includeNote: true },
    );
    expect(cleared.commercialNote).toBe('');
  });
});
