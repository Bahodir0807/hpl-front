import { describe, expect, it } from 'vitest';
import { installationSelectionToBoolean } from '@/components/leads/installation-required-field';
import {
  MANAGER_STAGE1_FORBIDDEN_FIELDS,
  buildQualificationPayload,
  buildQualifyLeadPayload,
  defaultContactMode,
  defaultObjectMode,
  qualifyLeadSchema,
} from './qualify-lead-form';

const UUID_CLIENT = '11111111-1111-4111-8111-111111111111';
const UUID_OBJECT = '22222222-2222-4222-8222-222222222222';
const UUID_CONTACT = '33333333-3333-4333-8333-333333333333';
const UUID_TYPE = '44444444-4444-4444-8444-444444444444';
const UUID_SIZE = '55555555-5555-4555-8555-555555555555';
const UUID_LEAD = '66666666-6666-4666-8666-666666666666';

function validForm(overrides: Record<string, unknown> = {}) {
  return {
    clientId: UUID_CLIENT,
    objectMode: 'EXISTING' as const,
    projectObjectId: UUID_OBJECT,
    newObjectName: '',
    contactMode: 'EXISTING' as const,
    contactId: UUID_CONTACT,
    contactFirstName: '',
    contactLastName: '',
    contactPhone: '',
    contactEmail: '',
    needDescription: 'HPL панели для фасада школы',
    decisionMakerContact: 'Главный архитектор',
    application: 'INTERIOR' as const,
    panelTypeId: UUID_TYPE,
    thicknessMm: 8,
    sizeMode: 'STANDARD' as const,
    panelSizeId: UUID_SIZE,
    customWidthMm: '',
    customHeightMm: '',
    colorCode: 'RAL-9005',
    colorName: 'Чёрный',
    requiredAreaM2: 24,
    installationRequired: 'yes' as const,
    urgent: false,
    willingToWait: true,
    ...overrides,
  };
}

describe('MANAGER Stage 1 qualification payload', () => {
  it('does not include commercial amount, timeline, stock-only or quality fields', () => {
    const parsed = qualifyLeadSchema.parse(validForm());
    const payload = buildQualifyLeadPayload({
      leadId: UUID_LEAD,
      clientId: parsed.clientId,
      contactId: parsed.contactId,
      projectObjectId: parsed.projectObjectId!,
      values: parsed,
      panelTypeId: UUID_TYPE,
      installationRequired: installationSelectionToBoolean(
        parsed.installationRequired,
      ),
    });

    expect(payload.contactId).toBe(UUID_CONTACT);
    expect(Object.keys(payload).sort()).toEqual(
      [
        'id',
        'clientId',
        'contactId',
        'projectObjectId',
        'needDescription',
        'decisionMakerContact',
        'qualification',
      ].sort(),
    );
    expect(Object.keys(payload.qualification ?? {}).sort()).toEqual(
      [
        'application',
        'panelTypeId',
        'thicknessMm',
        'panelSizeId',
        'colorCode',
        'colorName',
        'requiredAreaM2',
        'installationRequired',
        'urgent',
        'willingToWait',
        'customerRequirements',
      ].sort(),
    );
    for (const field of MANAGER_STAGE1_FORBIDDEN_FIELDS) {
      expect(payload).not.toHaveProperty(field);
      expect(payload.qualification).not.toHaveProperty(field);
    }
    expect(JSON.stringify(payload)).not.toContain('estimatedAmount');
    expect(JSON.stringify(payload)).not.toContain('estimatedAmountCurrency');
    expect(JSON.stringify(payload)).not.toContain('targetDate');
    expect(JSON.stringify(payload)).not.toContain('stockOnly');
  });

  it('omits contactId when none is selected', () => {
    const parsed = qualifyLeadSchema.parse(validForm());
    const payload = buildQualifyLeadPayload({
      leadId: UUID_LEAD,
      clientId: parsed.clientId,
      projectObjectId: parsed.projectObjectId!,
      values: parsed,
      panelTypeId: UUID_TYPE,
      installationRequired: true,
    });

    expect(payload).not.toHaveProperty('contactId');
  });

  it('sends only projectObjectId in existing-object mode', () => {
    const parsed = qualifyLeadSchema.parse(
      validForm({
        objectMode: 'EXISTING',
        projectObjectId: UUID_OBJECT,
        newObjectName: 'Should not be sent',
      }),
    );
    const payload = buildQualifyLeadPayload({
      leadId: UUID_LEAD,
      clientId: parsed.clientId,
      projectObjectId: parsed.projectObjectId!,
      values: parsed,
      panelTypeId: UUID_TYPE,
      installationRequired: true,
    });

    expect(payload.projectObjectId).toBe(UUID_OBJECT);
    expect(JSON.stringify(payload)).not.toContain('Should not be sent');
    expect(payload).not.toHaveProperty('newObjectName');
  });

  it('rejects 0 area and accepts a positive value', () => {
    expect(qualifyLeadSchema.safeParse(validForm({ requiredAreaM2: 0 })).success).toBe(
      false,
    );
    expect(qualifyLeadSchema.safeParse(validForm({ requiredAreaM2: '' })).success).toBe(
      false,
    );
    expect(
      qualifyLeadSchema.safeParse(validForm({ requiredAreaM2: 12.5 })).success,
    ).toBe(true);
  });

  it('keeps LPR as customer-side decision maker data', () => {
    const parsed = qualifyLeadSchema.parse(validForm());
    const payload = buildQualifyLeadPayload({
      leadId: UUID_LEAD,
      clientId: parsed.clientId,
      projectObjectId: parsed.projectObjectId!,
      values: parsed,
      panelTypeId: UUID_TYPE,
      installationRequired: true,
    });

    expect(payload.decisionMakerContact).toBe('Главный архитектор');
  });

  it('defaults object and contact modes to existing without inventing records', () => {
    expect(defaultObjectMode(undefined)).toBe('EXISTING');
    expect(defaultObjectMode(UUID_OBJECT)).toBe('EXISTING');
    expect(defaultContactMode(undefined)).toBe('EXISTING');
    expect(defaultContactMode(UUID_CONTACT)).toBe('EXISTING');
  });

  it('omits panelSizeId for custom size and omits custom size for standard', () => {
    const custom = buildQualificationPayload(
      {
        ...qualifyLeadSchema.parse(
          validForm({
            sizeMode: 'CUSTOM',
            panelSizeId: UUID_SIZE,
            customWidthMm: 1230,
            customHeightMm: 2460,
          }),
        ),
        panelTypeId: UUID_TYPE,
      },
      true,
    );
    expect(custom).not.toHaveProperty('panelSizeId');
    expect(custom.customWidthMm).toBe(1230);

    const standard = buildQualificationPayload(
      {
        ...qualifyLeadSchema.parse(validForm()),
        panelTypeId: UUID_TYPE,
      },
      true,
    );
    expect(standard.panelSizeId).toBe(UUID_SIZE);
    expect(standard).not.toHaveProperty('customWidthMm');
  });
});
