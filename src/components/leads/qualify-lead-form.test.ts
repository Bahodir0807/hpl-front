import { describe, expect, it } from 'vitest';
import { installationSelectionToBoolean } from '@/components/leads/installation-required-field';
import {
  MANAGER_STAGE1_FORBIDDEN_FIELDS,
  buildQualificationItemPayload,
  buildQualifyLeadPayload,
  defaultContactMode,
  defaultObjectMode,
  normalizeQualificationAreaM2,
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
    newObjectAddress: '',
    objectStage: '',
    objectExpectedDate: '',
    contactMode: 'EXISTING' as const,
    contactId: UUID_CONTACT,
    contactFirstName: '',
    contactLastName: '',
    contactPhone: '',
    contactEmail: '',
    needDescription: 'HPL панели для фасада школы',
    decisionMakerContact: 'Главный архитектор',
    installationRequired: 'yes' as const,
    ventFacadeExists: 'unknown' as const,
    ventFacadeKitRequired: 'unknown' as const,
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
      installationRequired: installationSelectionToBoolean(
        parsed.installationRequired,
      ),
      items: [],
    });

    expect(payload.contactId).toBe(UUID_CONTACT);
    expect(Object.keys(payload).sort()).toEqual(
      [
        'id',
        'clientId',
        'contactId',
        'projectObjectId',
        'objectStage',
        'objectExpectedDate',
        'needDescription',
        'decisionMakerContact',
        'qualification',
      ].sort(),
    );
    expect(Object.keys(payload.qualification ?? {}).sort()).toEqual(
      [
        'installationRequired',
        'ventFacadeExists',
        'ventFacadeKitRequired',
        'urgent',
        'willingToWait',
        'customerRequirements',
        'items',
      ].sort(),
    );
    expect(payload.qualification?.items).toEqual([]);
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
      installationRequired: true,
      items: [],
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
      installationRequired: true,
      items: [],
    });

    expect(payload.projectObjectId).toBe(UUID_OBJECT);
    expect(JSON.stringify(payload)).not.toContain('Should not be sent');
    expect(payload).not.toHaveProperty('newObjectName');
  });

  it('persists object stage and deadline on the existing ProjectObject contract', () => {
    const parsed = qualifyLeadSchema.parse(
      validForm({
        objectStage: 'Скоро фасад',
        objectExpectedDate: '2026-11-15',
      }),
    );
    const payload = buildQualifyLeadPayload({
      leadId: UUID_LEAD,
      clientId: parsed.clientId,
      projectObjectId: parsed.projectObjectId!,
      values: parsed,
      installationRequired: true,
      items: [],
    });

    expect(payload.objectStage).toBe('Скоро фасад');
    expect(payload.objectExpectedDate).toMatch(/^2026-11-1[45]T/);
  });

  it.each([
    ['yes', 'no', true, false],
    ['no', 'yes', false, true],
    ['unknown', 'unknown', null, null],
  ] as const)(
    'maps vent facade %s/%s to %s/%s on the qualify HTTP contract',
    (ventExists, kitRequired, expectedExists, expectedKit) => {
      const parsed = qualifyLeadSchema.parse(
        validForm({
          ventFacadeExists: ventExists,
          ventFacadeKitRequired: kitRequired,
        }),
      );
      const payload = buildQualifyLeadPayload({
        leadId: UUID_LEAD,
        clientId: parsed.clientId,
        projectObjectId: parsed.projectObjectId!,
        values: parsed,
        installationRequired: true,
        items: [],
      });

      expect(payload.qualification).toMatchObject({
        installationRequired: true,
        ventFacadeExists: expectedExists,
        ventFacadeKitRequired: expectedKit,
      });
    },
  );

  it('rejects contradictory urgency and keeps both-false valid', () => {
    expect(
      qualifyLeadSchema.safeParse(validForm({ urgent: true, willingToWait: true }))
        .success,
    ).toBe(false);
    expect(
      qualifyLeadSchema.safeParse(validForm({ urgent: true, willingToWait: false }))
        .success,
    ).toBe(true);
    expect(
      qualifyLeadSchema.safeParse(
        validForm({ urgent: false, willingToWait: false }),
      ).success,
    ).toBe(true);
  });

  it('forces willingToWait=false when urgent is selected', () => {
    const parsed = qualifyLeadSchema.parse(
      validForm({ urgent: true, willingToWait: false }),
    );
    const payload = buildQualifyLeadPayload({
      leadId: UUID_LEAD,
      clientId: parsed.clientId,
      projectObjectId: parsed.projectObjectId!,
      values: parsed,
      installationRequired: true,
      items: [],
    });

    expect(payload.qualification).toMatchObject({
      urgent: true,
      willingToWait: false,
    });
  });

  it('keeps LPR as customer-side decision maker data', () => {
    const parsed = qualifyLeadSchema.parse(validForm());
    const payload = buildQualifyLeadPayload({
      leadId: UUID_LEAD,
      clientId: parsed.clientId,
      projectObjectId: parsed.projectObjectId!,
      values: parsed,
      installationRequired: true,
      items: [],
    });

    expect(payload.decisionMakerContact).toBe('Главный архитектор');
  });

  it('defaults object and contact modes to existing without inventing records', () => {
    expect(defaultObjectMode(undefined)).toBe('EXISTING');
    expect(defaultObjectMode(UUID_OBJECT)).toBe('EXISTING');
    expect(defaultContactMode(undefined)).toBe('EXISTING');
    expect(defaultContactMode(UUID_CONTACT)).toBe('EXISTING');
  });

  it('saves an HPL item without exact RAL, thickness or size', () => {
    const item = buildQualificationItemPayload(
      {
        application: 'INTERIOR',
        thicknessMm: '',
        sizeMode: 'STANDARD',
        panelSizeId: '',
        colorCode: '',
        colorName: 'тёмно-серый',
        requiredAreaM2: '24,5',
      },
      UUID_TYPE,
    );

    expect(item).toEqual({
      application: 'INTERIOR',
      panelTypeId: UUID_TYPE,
      thicknessMm: null,
      panelSizeId: null,
      customWidthMm: null,
      customHeightMm: null,
      colorCode: null,
      colorName: 'тёмно-серый',
      coating: null,
      texture: null,
      requiredAreaM2: 24.5,
    });
  });

  it('keeps an exact RAL when the customer knows it', () => {
    const item = buildQualificationItemPayload(
      {
        application: 'INTERIOR',
        thicknessMm: 8,
        sizeMode: 'STANDARD',
        panelSizeId: UUID_SIZE,
        colorCode: 'RAL-7016',
        colorName: 'антрацит',
        requiredAreaM2: 12,
      },
      UUID_TYPE,
    );

    expect(item).toMatchObject({
      thicknessMm: 8,
      panelSizeId: UUID_SIZE,
      colorCode: 'RAL-7016',
      colorName: 'антрацит',
    });
  });

  it('persists optional customer coating and texture independently of color', () => {
    const withFinish = buildQualificationItemPayload(
      {
        application: 'INTERIOR',
        sizeMode: 'STANDARD',
        colorName: 'Серый',
        coating: 'матовое',
        texture: 'под камень',
        requiredAreaM2: 12,
      },
      UUID_TYPE,
    );
    expect(withFinish.coating).toBe('матовое');
    expect(withFinish.texture).toBe('под камень');
    expect(withFinish.colorName).toBe('Серый');

    const blankFinish = buildQualificationItemPayload(
      {
        application: 'INTERIOR',
        sizeMode: 'STANDARD',
        colorName: 'Черный',
        coating: '  ',
        texture: '',
        requiredAreaM2: 4,
      },
      UUID_TYPE,
    );
    expect(blankFinish.coating).toBeNull();
    expect(blankFinish.texture).toBeNull();
    expect(blankFinish.colorName).toBe('Черный');
  });

  it('omits panelSizeId for custom size and omits custom size for standard', () => {
    const custom = buildQualificationItemPayload(
      {
        application: 'INTERIOR',
        sizeMode: 'CUSTOM',
        panelSizeId: UUID_SIZE,
        customWidthMm: 1230,
        customHeightMm: 2460,
        requiredAreaM2: 12,
      },
      UUID_TYPE,
    );
    expect(custom.panelSizeId).toBeNull();
    expect(custom.customWidthMm).toBe(1230);

    const standard = buildQualificationItemPayload(
      {
        application: 'INTERIOR',
        sizeMode: 'STANDARD',
        panelSizeId: UUID_SIZE,
        customWidthMm: 1230,
        customHeightMm: 2460,
        requiredAreaM2: 12,
      },
      UUID_TYPE,
    );
    expect(standard.panelSizeId).toBe(UUID_SIZE);
    expect(standard.customWidthMm).toBeNull();
  });
});

describe('normalizeQualificationAreaM2', () => {
  it('accepts positive decimals and a Russian comma', () => {
    expect(normalizeQualificationAreaM2('12.5')).toBe(12.5);
    expect(normalizeQualificationAreaM2('24,5')).toBe(24.5);
    expect(normalizeQualificationAreaM2(8)).toBe(8);
  });

  it('rejects empty, zero, negative and non-numeric values', () => {
    expect(normalizeQualificationAreaM2('')).toBeNull();
    expect(normalizeQualificationAreaM2(undefined)).toBeNull();
    expect(normalizeQualificationAreaM2('0')).toBeNull();
    expect(normalizeQualificationAreaM2('-1')).toBeNull();
    expect(normalizeQualificationAreaM2('abc')).toBeNull();
    expect(normalizeQualificationAreaM2('12.12345')).toBeNull();
  });
});
