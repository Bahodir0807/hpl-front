import { describe, expect, it } from 'vitest';
import { installationSelectionToBoolean } from '@/components/leads/installation-required-field';
import { buildQualificationPayload } from '@/components/leads/qualify-lead-form';
import {
  buildCalculationSizeFields,
  prefillCalculatorFromQualification,
} from './hpl-calculator';

describe('calculator prefill from Stage 1 qualification', () => {
  it('initializes calculation form values from qualification', () => {
    const prefill = prefillCalculatorFromQualification(
      {
        application: 'EXTERIOR_WITH_UV',
        panelTypeId: 'type-exterior',
        thicknessMm: '12',
        panelSizeId: 'size-standard',
        colorCode: 'RAL-9005',
        colorName: 'Чёрный',
        requiredAreaM2: '48.5',
      },
      [{ id: 'type-exterior', code: 'exterior_with_uv' }],
    );

    expect(prefill).toMatchObject({
      application: 'EXTERIOR_WITH_UV',
      panelTypeId: 'type-exterior',
      thicknessMm: 12,
      sizeMode: 'STANDARD',
      panelSizeId: 'size-standard',
      colorCode: 'RAL-9005',
      requiredAreaM2: '48.5',
    });
  });

  it('prefills custom dimensions instead of a fake panelSizeId', () => {
    const prefill = prefillCalculatorFromQualification({
      application: 'FURNITURE',
      panelTypeId: 'type-furniture',
      thicknessMm: '1.5',
      customWidthMm: 1230,
      customHeightMm: 2460,
      requiredAreaM2: 10,
    });

    expect(prefill.sizeMode).toBe('CUSTOM');
    expect(prefill.panelSizeId).toBe('');
    expect(prefill.customWidthMm).toBe('1230');
    expect(prefill.customHeightMm).toBe('2460');
    expect(prefill.thicknessMm).toBe(1.5);
  });
});

describe('calculator custom size fields', () => {
  it('omits panelSizeId for custom calculations', () => {
    expect(
      buildCalculationSizeFields({
        sizeMode: 'CUSTOM',
        panelSizeId: 'should-not-be-sent',
        customWidthMm: '1230',
        customHeightMm: '2460',
      }),
    ).toEqual({
      customWidthMm: 1230,
      customHeightMm: 2460,
    });
  });
});

describe('Stage 1 qualification payload', () => {
  it('emits EXTERIOR_WITH_UV and custom dimensions without panelSizeId', () => {
    const payload = buildQualificationPayload(
      {
        application: 'EXTERIOR_WITH_UV',
        panelTypeId: '11111111-1111-1111-1111-111111111111',
        thicknessMm: 8,
        sizeMode: 'CUSTOM',
        panelSizeId: '22222222-2222-2222-2222-222222222222',
        customWidthMm: 1230,
        customHeightMm: 2460,
        colorCode: 'RAL-9005',
        colorName: 'Чёрный',
        requiredAreaM2: 20,
        installationRequired: 'yes',
        urgent: false,
        willingToWait: true,
        needDescription: 'Фасад здания',
      },
      installationSelectionToBoolean('yes'),
    );

    expect(payload.application).toBe('EXTERIOR_WITH_UV');
    expect(payload.customWidthMm).toBe(1230);
    expect(payload.customHeightMm).toBe(2460);
    expect(payload).not.toHaveProperty('panelSizeId');
    expect(payload).not.toHaveProperty('stockOnly');
  });
});
