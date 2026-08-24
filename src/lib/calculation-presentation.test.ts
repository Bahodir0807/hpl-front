import { describe, expect, it } from 'vitest';
import {
  COMMERCIAL_CALCULATION_WAITING_COPY,
  canConvertCalculationToQuote,
  canCreateCalculationRequest,
  canEnterManualPurchasePrice,
  canRunCommercialCalculation,
  canViewCommercialCalculation,
  shouldWaitForCommercialCalculation,
  validateManualPurchasePriceCny,
  PURCHASE_PRICE_INVALID_MESSAGE,
  PURCHASE_PRICE_REQUIRED_MESSAGE,
} from './calculation-presentation';

const MANAGER_PERMISSIONS = [
  'leads:read',
  'leads:qualify',
  'calculations:read',
  'calculations:create',
  'calculations:update',
  'quotes:read',
  'quotes:create',
  'quotes:update',
  'quotes:client_accept',
] as const;

const HEAD_PERMISSIONS = [
  'leads:read',
  'leads:read_all',
  'leads:qualify',
  'leads:commercial_qualify',
  'calculations:read',
  'calculations:read_all',
  'calculations:create',
  'calculations:update',
  'quotes:read',
  'quotes:read_all',
  'quotes:create',
  'quotes:update',
  'quotes:approve',
] as const;

const DIRECTOR_PERMISSIONS = [
  'leads:read',
  'leads:read_all',
  'calculations:read',
  'calculations:read_all',
  'quotes:read',
  'quotes:read_all',
] as const;

describe('commercial calculation authority', () => {
  it('does not let MANAGER run priced calculation even with calculations:create', () => {
    expect(canRunCommercialCalculation(MANAGER_PERMISSIONS)).toBe(false);
    expect(canConvertCalculationToQuote(MANAGER_PERMISSIONS)).toBe(false);
    expect(canViewCommercialCalculation(MANAGER_PERMISSIONS)).toBe(true);
    expect(canCreateCalculationRequest(MANAGER_PERMISSIONS)).toBe(true);
  });

  it('lets HEAD run calculation and convert it to a Quote', () => {
    expect(canRunCommercialCalculation(HEAD_PERMISSIONS)).toBe(true);
    expect(canConvertCalculationToQuote(HEAD_PERMISSIONS)).toBe(true);
  });

  it('does not let DIRECTOR run calculation while backend omits calculations:create', () => {
    expect(canRunCommercialCalculation(DIRECTOR_PERMISSIONS)).toBe(false);
    expect(canConvertCalculationToQuote(DIRECTOR_PERMISSIONS)).toBe(false);
    expect(canViewCommercialCalculation(DIRECTOR_PERMISSIONS)).toBe(true);
  });

  it('lets DIRECTOR run calculation if backend later grants create', () => {
    expect(
      canRunCommercialCalculation([
        ...DIRECTOR_PERMISSIONS,
        'calculations:create',
      ]),
    ).toBe(true);
    expect(
      canConvertCalculationToQuote([...DIRECTOR_PERMISSIONS, 'quotes:create']),
    ).toBe(true);
    expect(
      canEnterManualPurchasePrice([
        ...DIRECTOR_PERMISSIONS,
        'calculations:create',
      ]),
    ).toBe(false);
  });

  it('lets only HEAD enter a manual purchase price', () => {
    expect(canEnterManualPurchasePrice(HEAD_PERMISSIONS)).toBe(true);
    expect(canEnterManualPurchasePrice(MANAGER_PERMISSIONS)).toBe(false);
    expect(canEnterManualPurchasePrice(DIRECTOR_PERMISSIONS)).toBe(false);
  });

  it('rejects empty, zero, negative and non-numeric purchase prices', () => {
    expect(validateManualPurchasePriceCny('')).toBe(
      PURCHASE_PRICE_REQUIRED_MESSAGE,
    );
    expect(validateManualPurchasePriceCny('0')).toBe(
      PURCHASE_PRICE_INVALID_MESSAGE,
    );
    expect(validateManualPurchasePriceCny('-8')).toBe(
      PURCHASE_PRICE_INVALID_MESSAGE,
    );
    expect(validateManualPurchasePriceCny('abc')).toBe(
      PURCHASE_PRICE_INVALID_MESSAGE,
    );
    expect(validateManualPurchasePriceCny('80')).toBeNull();
  });

  it('shows the waiting copy only after Stage 1 when the user cannot create a request', () => {
    expect(COMMERCIAL_CALCULATION_WAITING_COPY).toBe(
      'Коммерческий расчёт ожидает руководителя.',
    );
    expect(
      shouldWaitForCommercialCalculation({
        permissions: MANAGER_PERMISSIONS,
        hasCalculation: false,
        stage1Complete: true,
      }),
    ).toBe(false);
    expect(
      shouldWaitForCommercialCalculation({
        permissions: DIRECTOR_PERMISSIONS,
        hasCalculation: false,
        stage1Complete: true,
      }),
    ).toBe(true);
    expect(
      shouldWaitForCommercialCalculation({
        permissions: MANAGER_PERMISSIONS,
        hasCalculation: true,
        stage1Complete: true,
      }),
    ).toBe(false);
    expect(
      shouldWaitForCommercialCalculation({
        permissions: HEAD_PERMISSIONS,
        hasCalculation: false,
        stage1Complete: true,
      }),
    ).toBe(false);
    expect(
      shouldWaitForCommercialCalculation({
        permissions: MANAGER_PERMISSIONS,
        hasCalculation: false,
        stage1Complete: false,
      }),
    ).toBe(false);
  });
});
