import { describe, expect, it } from 'vitest';
import {
  STANDARD_DISCRETE_THICKNESSES_MM,
  buildSizePayload,
  formatThicknessMm,
  isValidThicknessForApplication,
  panelSizeLabel,
  panelTypeLabel,
  toCanonicalHplApplication,
} from './hpl-domain';

describe('HPL domain mapping', () => {
  it('uses canonical i18n over displayNameRu when the panel type code is known', () => {
    expect(
      panelTypeLabel({
        code: 'interior',
        displayNameRu: 'Интерьерный',
        name: 'Interior stale',
      }),
    ).toBe('Интерьерный');
  });

  it('labels PanelSize from displayName and widthMm/heightMm', () => {
    expect(
      panelSizeLabel({
        displayName: '1220 × 2440',
        widthMm: 1220,
        heightMm: 2440,
        width: 1,
        length: 2,
        label: 'old label',
      }),
    ).toBe('1220 × 2440');

    expect(
      panelSizeLabel({
        widthMm: 1300,
        heightMm: 2800,
      }),
    ).toBe('1300 × 2800 мм');
  });

  it('maps legacy EXTERIOR to EXTERIOR_WITH_UV without emitting EXTERIOR', () => {
    expect(toCanonicalHplApplication('EXTERIOR')).toBe('EXTERIOR_WITH_UV');
    expect(toCanonicalHplApplication('exterior')).toBe('EXTERIOR_WITH_UV');
  });
});

describe('HPL thickness rules', () => {
  it('accepts furniture range 0.5 / 1.5 / 2.9 and rejects out-of-range', () => {
    expect(isValidThicknessForApplication('FURNITURE', 0.5)).toBe(true);
    expect(isValidThicknessForApplication('FURNITURE', '1.5')).toBe(true);
    expect(isValidThicknessForApplication('FURNITURE', '2.9')).toBe(true);
    expect(isValidThicknessForApplication('FURNITURE', 0.4)).toBe(false);
    expect(isValidThicknessForApplication('FURNITURE', 3)).toBe(false);
  });

  it('offers discrete thicknesses without 16 mm and rejects decimals for standard types', () => {
    expect([...STANDARD_DISCRETE_THICKNESSES_MM]).toEqual([
      1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 25,
    ]);
    expect(STANDARD_DISCRETE_THICKNESSES_MM).not.toContain(16);

    for (const application of ['INTERIOR', 'EXTERIOR_WITH_UV', 'LABORATORY'] as const) {
      expect(isValidThicknessForApplication(application, 1)).toBe(true);
      expect(isValidThicknessForApplication(application, 15)).toBe(true);
      expect(isValidThicknessForApplication(application, 25)).toBe(true);
      expect(isValidThicknessForApplication(application, 16)).toBe(false);
      expect(isValidThicknessForApplication(application, 1.5)).toBe(false);
    }
  });

  it('formats decimal thickness without truncation or [object Object]', () => {
    expect(formatThicknessMm('2.9')).toBe('2.9 мм');
    expect(formatThicknessMm(1.5)).toBe('1.5 мм');
  });
});

describe('custom size payload', () => {
  it('sends customWidthMm/customHeightMm without a fake panelSizeId', () => {
    expect(
      buildSizePayload({
        sizeMode: 'CUSTOM',
        panelSizeId: '11111111-1111-1111-1111-111111111111',
        customWidthMm: 1230,
        customHeightMm: 2460,
      }),
    ).toEqual({
      customWidthMm: 1230,
      customHeightMm: 2460,
    });
  });

  it('sends panelSizeId for standard size and omits custom dimensions', () => {
    expect(
      buildSizePayload({
        sizeMode: 'STANDARD',
        panelSizeId: '11111111-1111-1111-1111-111111111111',
        customWidthMm: 1230,
        customHeightMm: 2460,
      }),
    ).toEqual({
      panelSizeId: '11111111-1111-1111-1111-111111111111',
    });
  });
});
