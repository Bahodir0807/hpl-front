import { z } from 'zod';
import type {
  QualifyLeadPayload,
  UpsertLeadQualificationPayload,
} from '@/hooks/use-leads';
import {
  buildSizePayload,
  toCanonicalHplApplication,
  toDecimalNumber,
  type HplApplication,
  type SizeMode,
} from '@/lib/hpl-domain';
import { dateInputToIso } from '@/lib/format';
import { createOptionalPhoneSchema } from '@/lib/validations/phone';
import { getActiveMessages } from '@/i18n/active-messages';
import type { Messages } from '@/i18n/types';

function optionalUuidSchema(messages: Messages) {
  return z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().uuid().safeParse(value).success, {
      message: messages.leads.selectFromList,
    });
}

function optionalEmailSchema(messages: Messages) {
  return z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: messages.leads.invalidEmail,
    });
}

export const TRI_STATE_SELECTIONS = ['yes', 'no', 'unknown'] as const;
export type TriStateSelection = (typeof TRI_STATE_SELECTIONS)[number];

export function createQualifyLeadSchema(messages: Messages = getActiveMessages()) {
  const optionalUuid = optionalUuidSchema(messages);
  const optionalEmail = optionalEmailSchema(messages);

  return z
    .object({
      clientId: z.string().trim().uuid(messages.leads.selectClient),
      objectMode: z.enum(['EXISTING', 'NEW'], {
        message: messages.leads.selectExistingOrNewObject,
      }),
      projectObjectId: optionalUuid,
      newObjectName: z.string().trim().optional(),
      newObjectAddress: z.string().trim().optional(),
      objectStage: z.string().trim().max(255).optional(),
      objectExpectedDate: z.string().trim().optional(),
      contactMode: z.enum(['EXISTING', 'NEW'], {
        message: messages.leads.selectExistingOrNewContact,
      }),
      contactId: optionalUuid,
      contactFirstName: z.string().trim().optional(),
      contactLastName: z.string().trim().optional(),
      contactPhone: createOptionalPhoneSchema(messages),
      contactEmail: optionalEmail,
      needDescription: z.string().trim().min(5, messages.leads.describeNeed),
      decisionMakerContact: z
        .string()
        .trim()
        .min(1, messages.leads.decisionMakerRequired),
      installationRequired: z.enum(['yes', 'no'], {
        message: messages.leads.installationRequiredMsg,
      }),
      ventFacadeExists: z.enum(TRI_STATE_SELECTIONS),
      ventFacadeKitRequired: z.enum(TRI_STATE_SELECTIONS),
      urgent: z.boolean(),
      willingToWait: z.boolean(),
    })
    .superRefine((value, ctx) => {
      if (value.objectMode === 'EXISTING') {
        if (!z.string().uuid().safeParse(value.projectObjectId).success) {
          ctx.addIssue({
            code: 'custom',
            path: ['projectObjectId'],
            message: messages.leads.selectObject,
          });
        }
      } else if (!value.newObjectName?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['newObjectName'],
          message: messages.leads.newObjectNameRequired,
        });
      }

      if (value.contactMode === 'EXISTING') {
        if (!z.string().uuid().safeParse(value.contactId).success) {
          ctx.addIssue({
            code: 'custom',
            path: ['contactId'],
            message: messages.leads.selectContact,
          });
        }
      } else if (!value.contactFirstName?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['contactFirstName'],
          message: messages.leads.contactFirstNameRequired,
        });
      }

      if (value.urgent && value.willingToWait) {
        ctx.addIssue({
          code: 'custom',
          path: ['willingToWait'],
          message: messages.leads.urgentAndWaitConflict,
        });
      }
    });
}

export const qualifyLeadSchema = createQualifyLeadSchema();

export type QualifyLeadFormInput = z.input<typeof qualifyLeadSchema>;
export type QualifyLeadFormValues = z.output<typeof qualifyLeadSchema>;

export type QualificationItemPayload = NonNullable<
  UpsertLeadQualificationPayload['items']
>[number];

export type QualificationItemPayloadInput = {
  application: HplApplication;
  thicknessMm?: string | number | null;
  sizeMode: SizeMode;
  panelSizeId?: string | null;
  customWidthMm?: string | number | null;
  customHeightMm?: string | number | null;
  colorCode?: string | null;
  colorName?: string | null;
  coating?: string | null;
  texture?: string | null;
  requiredAreaM2: string | number;
};

export const MANAGER_STAGE1_FORBIDDEN_FIELDS = [
  'estimatedAmount',
  'estimatedAmountCurrency',
  'estimatedCurrency',
  'targetDate',
  'stockOnly',
  'supplierId',
  'qualityClassId',
  'prices',
  'markup',
  'discount',
] as const;

function optionalText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Accepts a customer-entered decimal (including a Russian comma) and emits a safe m² number. */
export function normalizeQualificationAreaM2(
  value: string | number | null | undefined,
): number | null {
  const raw = typeof value === 'number' ? String(value) : value?.trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(',', '.');
  if (!/^\d+(?:\.\d{1,4})?$/.test(normalized)) {
    return null;
  }

  const area = Number(normalized);
  if (!Number.isFinite(area) || area <= 0) {
    return null;
  }

  return Number(area.toFixed(4));
}

export function triStateSelectionToNullableBoolean(
  value: TriStateSelection,
): boolean | null {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return null;
}

export function nullableBooleanToTriStateSelection(
  value: boolean | null | undefined,
): TriStateSelection {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return 'unknown';
}

export function buildQualificationPayload(
  values: Pick<
    QualifyLeadFormValues,
    | 'installationRequired'
    | 'ventFacadeExists'
    | 'ventFacadeKitRequired'
    | 'urgent'
    | 'willingToWait'
    | 'needDescription'
  >,
  installationRequired: boolean,
): UpsertLeadQualificationPayload {
  return {
    installationRequired,
    ventFacadeExists: triStateSelectionToNullableBoolean(values.ventFacadeExists),
    ventFacadeKitRequired: triStateSelectionToNullableBoolean(
      values.ventFacadeKitRequired,
    ),
    urgent: values.urgent,
    // Keep the API logically consistent even if a stale form state slips through.
    willingToWait: values.urgent ? false : values.willingToWait,
    customerRequirements: values.needDescription,
  };
}

export function buildQualificationItemPayload(
  values: QualificationItemPayloadInput,
  panelTypeId: string,
  messages: Messages = getActiveMessages(),
): QualificationItemPayload {
  const area = normalizeQualificationAreaM2(values.requiredAreaM2);
  if (area === null) {
    throw new Error(messages.leads.invalidArea);
  }

  const thicknessMm = toDecimalNumber(values.thicknessMm);
  const size = buildSizePayload(values);

  return {
    application: values.application,
    panelTypeId,
    thicknessMm: thicknessMm !== null && thicknessMm > 0 ? thicknessMm : null,
    panelSizeId: size.panelSizeId ?? null,
    customWidthMm: size.customWidthMm ?? null,
    customHeightMm: size.customHeightMm ?? null,
    colorCode: optionalText(values.colorCode) ?? null,
    colorName: optionalText(values.colorName) ?? null,
    coating: optionalText(values.coating) ?? null,
    texture: optionalText(values.texture) ?? null,
    requiredAreaM2: area,
  };
}

export function buildQualifyLeadPayload(input: {
  leadId: string;
  clientId: string;
  contactId?: string;
  projectObjectId: string;
  values: QualifyLeadFormValues;
  installationRequired: boolean;
  items: QualificationItemPayload[];
}): QualifyLeadPayload {
  return {
    id: input.leadId,
    clientId: input.clientId,
    ...(input.contactId ? { contactId: input.contactId } : {}),
    projectObjectId: input.projectObjectId,
    objectStage: optionalText(input.values.objectStage) ?? null,
    objectExpectedDate:
      dateInputToIso(input.values.objectExpectedDate ?? '') ?? null,
    needDescription: input.values.needDescription,
    decisionMakerContact: input.values.decisionMakerContact,
    qualification: {
      ...buildQualificationPayload(input.values, input.installationRequired),
      // An explicit empty array is meaningful: it clears legacy scalar HPL data.
      items: input.items,
    },
  };
}

export function defaultApplicationFromQualification(
  application?: string | null,
  panelTypeCode?: string | null,
): HplApplication | undefined {
  return (
    toCanonicalHplApplication(application) ??
    toCanonicalHplApplication(panelTypeCode) ??
    undefined
  );
}

export function defaultSizeModeFromQualification(qualification?: {
  panelSizeId?: string | null;
  customWidthMm?: number | string | null;
  customHeightMm?: number | string | null;
} | null): SizeMode {
  const width = toDecimalNumber(qualification?.customWidthMm);
  const height = toDecimalNumber(qualification?.customHeightMm);
  if (width !== null && height !== null && width > 0 && height > 0) {
    return 'CUSTOM';
  }

  return 'STANDARD';
}

export function defaultObjectMode(
  projectObjectId?: string | null,
): 'EXISTING' | 'NEW' {
  void projectObjectId;
  return 'EXISTING';
}

export function defaultContactMode(
  contactId?: string | null,
): 'EXISTING' | 'NEW' {
  void contactId;
  return 'EXISTING';
}
