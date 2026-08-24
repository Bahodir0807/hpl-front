import { z } from 'zod';
import type {
  QualifyLeadPayload,
  UpsertLeadQualificationPayload,
} from '@/hooks/use-leads';
import {
  CANONICAL_HPL_APPLICATIONS,
  buildSizePayload,
  thicknessValidationMessage,
  toCanonicalHplApplication,
  toDecimalNumber,
  type HplApplication,
  type SizeMode,
} from '@/lib/hpl-domain';
import { optionalPhoneSchema } from '@/lib/validations/phone';

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || z.string().uuid().safeParse(value).success, {
    message: 'Выберите значение из списка',
  });

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || z.string().email().safeParse(value).success, {
    message: 'Некорректный email',
  });

const requiredAreaSchema = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  return value;
}, z.coerce.number().positive('Укажите площадь больше 0.'));

export const qualifyLeadSchema = z
  .object({
    clientId: z.string().trim().uuid('Выберите клиента'),
    objectMode: z.enum(['EXISTING', 'NEW'], {
      message: 'Выберите существующий или новый объект',
    }),
    projectObjectId: optionalUuid,
    newObjectName: z.string().trim().optional(),
    contactMode: z.enum(['EXISTING', 'NEW'], {
      message: 'Выберите существующий или новый контакт',
    }),
    contactId: optionalUuid,
    contactFirstName: z.string().trim().optional(),
    contactLastName: z.string().trim().optional(),
    contactPhone: optionalPhoneSchema,
    contactEmail: optionalEmail,
    needDescription: z.string().trim().min(5, 'Опишите потребность'),
    decisionMakerContact: z
      .string()
      .trim()
      .min(1, 'Укажите ЛПР / лицо, принимающее решение'),
    application: z.enum(CANONICAL_HPL_APPLICATIONS),
    panelTypeId: z.string().trim().optional(),
    thicknessMm: z.union([z.string(), z.number()]),
    sizeMode: z.enum(['STANDARD', 'CUSTOM']),
    panelSizeId: z.string().trim().optional(),
    customWidthMm: z.union([z.string(), z.number()]).optional(),
    customHeightMm: z.union([z.string(), z.number()]).optional(),
    colorCode: z.string().trim().min(1, 'Укажите цвет'),
    colorName: z.string().trim().optional(),
    requiredAreaM2: requiredAreaSchema,
    installationRequired: z.enum(['yes', 'no'], {
      message: 'Укажите монтаж',
    }),
    urgent: z.boolean(),
    willingToWait: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.objectMode === 'EXISTING') {
      if (!z.string().uuid().safeParse(value.projectObjectId).success) {
        ctx.addIssue({
          code: 'custom',
          path: ['projectObjectId'],
          message: 'Выберите объект',
        });
      }
    } else if (!value.newObjectName?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['newObjectName'],
        message: 'Укажите название нового объекта',
      });
    }

    if (value.contactMode === 'EXISTING') {
      if (!z.string().uuid().safeParse(value.contactId).success) {
        ctx.addIssue({
          code: 'custom',
          path: ['contactId'],
          message: 'Выберите контакт',
        });
      }
    } else if (!value.contactFirstName?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['contactFirstName'],
        message: 'Укажите имя контакта',
      });
    }

    const thicknessError = thicknessValidationMessage(
      value.application,
      value.thicknessMm,
    );
    if (thicknessError) {
      ctx.addIssue({
        code: 'custom',
        path: ['thicknessMm'],
        message: thicknessError,
      });
    }

    if (value.sizeMode === 'STANDARD') {
      if (!z.string().uuid().safeParse(value.panelSizeId).success) {
        ctx.addIssue({
          code: 'custom',
          path: ['panelSizeId'],
          message: 'Выберите стандартный размер',
        });
      }
      return;
    }

    const width = toDecimalNumber(value.customWidthMm);
    const height = toDecimalNumber(value.customHeightMm);
    if (width === null || width <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['customWidthMm'],
        message: 'Укажите ширину больше 0',
      });
    }
    if (height === null || height <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['customHeightMm'],
        message: 'Укажите высоту больше 0',
      });
    }
  });

export type QualifyLeadFormInput = z.input<typeof qualifyLeadSchema>;
export type QualifyLeadFormValues = z.output<typeof qualifyLeadSchema>;

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

export function buildQualificationPayload(
  values: Pick<
    QualifyLeadFormValues,
    | 'application'
    | 'panelTypeId'
    | 'thicknessMm'
    | 'sizeMode'
    | 'panelSizeId'
    | 'customWidthMm'
    | 'customHeightMm'
    | 'colorCode'
    | 'colorName'
    | 'requiredAreaM2'
    | 'installationRequired'
    | 'urgent'
    | 'willingToWait'
    | 'needDescription'
  >,
  installationRequired: boolean,
): UpsertLeadQualificationPayload {
  const thicknessMm = toDecimalNumber(values.thicknessMm);
  const size = buildSizePayload({
    sizeMode: values.sizeMode,
    panelSizeId: values.panelSizeId,
    customWidthMm: values.customWidthMm,
    customHeightMm: values.customHeightMm,
  });

  return {
    application: values.application,
    panelTypeId: values.panelTypeId,
    ...(thicknessMm !== null ? { thicknessMm } : {}),
    ...size,
    colorCode: values.colorCode,
    colorName: values.colorName || null,
    requiredAreaM2: values.requiredAreaM2,
    installationRequired,
    urgent: values.urgent,
    willingToWait: values.willingToWait,
    customerRequirements: values.needDescription,
  };
}

export function buildQualifyLeadPayload(input: {
  leadId: string;
  clientId: string;
  contactId?: string;
  projectObjectId: string;
  values: QualifyLeadFormValues;
  panelTypeId: string;
  installationRequired: boolean;
}): QualifyLeadPayload {
  return {
    id: input.leadId,
    clientId: input.clientId,
    ...(input.contactId ? { contactId: input.contactId } : {}),
    projectObjectId: input.projectObjectId,
    needDescription: input.values.needDescription,
    decisionMakerContact: input.values.decisionMakerContact,
    qualification: buildQualificationPayload(
      { ...input.values, panelTypeId: input.panelTypeId },
      input.installationRequired,
    ),
  };
}

export function defaultApplicationFromQualification(
  application?: string | null,
  panelTypeCode?: string | null,
): HplApplication {
  return (
    toCanonicalHplApplication(application) ??
    toCanonicalHplApplication(panelTypeCode) ??
    'INTERIOR'
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

export function defaultObjectMode(projectObjectId?: string | null): 'EXISTING' | 'NEW' {
  return projectObjectId ? 'EXISTING' : 'EXISTING';
}

export function defaultContactMode(contactId?: string | null): 'EXISTING' | 'NEW' {
  return contactId ? 'EXISTING' : 'EXISTING';
}
