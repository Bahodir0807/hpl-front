import { getActiveMessages } from '@/i18n/active-messages';
import { localizeSystemText } from '@/i18n/system-labels';
import { ru } from '@/i18n/ru';
import type { Messages } from '@/i18n/types';
import { interpolate } from '@/i18n/translate';

export const CANONICAL_HPL_APPLICATIONS = [
  'INTERIOR',
  'EXTERIOR_WITH_UV',
  'LABORATORY',
  'FURNITURE',
] as const;

export type HplApplication = (typeof CANONICAL_HPL_APPLICATIONS)[number];

/** Legacy stored value. New UI must emit EXTERIOR_WITH_UV. */
export type LegacyHplApplication = 'EXTERIOR';

export type StoredHplApplication = HplApplication | LegacyHplApplication;

export const PANEL_TYPE_CODES = [
  'interior',
  'exterior_with_uv',
  'laboratory',
  'furniture',
] as const;

export type PanelTypeCode = (typeof PANEL_TYPE_CODES)[number];

export const HPL_APPLICATION_LABELS: Record<HplApplication, string> = {
  ...ru.hpl.applications,
};

export const STANDARD_DISCRETE_THICKNESSES_MM = [
  1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 25,
] as const;

export const FURNITURE_THICKNESS_MIN_MM = 0.5;
export const FURNITURE_THICKNESS_MAX_MM = 2.9;
export const FURNITURE_THICKNESS_STEP = 0.1;

export const CUSTOM_SIZE_PRICING_NOTE = ru.hpl.customSizePricingNote;

export type SizeMode = 'STANDARD' | 'CUSTOM';

const APPLICATION_TO_PANEL_CODE: Record<HplApplication, PanelTypeCode> = {
  INTERIOR: 'interior',
  EXTERIOR_WITH_UV: 'exterior_with_uv',
  LABORATORY: 'laboratory',
  FURNITURE: 'furniture',
};

const PANEL_CODE_TO_APPLICATION: Record<PanelTypeCode, HplApplication> = {
  interior: 'INTERIOR',
  exterior_with_uv: 'EXTERIOR_WITH_UV',
  laboratory: 'LABORATORY',
  furniture: 'FURNITURE',
};

export function isCanonicalHplApplication(
  value: string | null | undefined,
): value is HplApplication {
  return CANONICAL_HPL_APPLICATIONS.includes(value as HplApplication);
}

export function isStandardPanelTypeCode(
  value: string | null | undefined,
): value is PanelTypeCode {
  return PANEL_TYPE_CODES.includes(
    String(value ?? '')
      .trim()
      .toLowerCase() as PanelTypeCode,
  );
}

export function normalizePanelTypeCode(
  value: string | null | undefined,
): PanelTypeCode | null {
  const code = String(value ?? '')
    .trim()
    .toLowerCase();

  if (code === 'exterior') {
    return 'exterior_with_uv';
  }

  return isStandardPanelTypeCode(code) ? code : null;
}

export function toCanonicalHplApplication(
  value: string | null | undefined,
): HplApplication | null {
  if (!value) {
    return null;
  }

  if (isCanonicalHplApplication(value)) {
    return value;
  }

  if (value === 'EXTERIOR') {
    return 'EXTERIOR_WITH_UV';
  }

  return applicationFromPanelTypeCode(value);
}

export function applicationFromPanelTypeCode(
  code: string | null | undefined,
): HplApplication | null {
  const normalized = normalizePanelTypeCode(code);
  return normalized ? PANEL_CODE_TO_APPLICATION[normalized] : null;
}

export function panelTypeCodeFromApplication(
  application: string | null | undefined,
): PanelTypeCode | null {
  const canonical = toCanonicalHplApplication(application);
  return canonical ? APPLICATION_TO_PANEL_CODE[canonical] : null;
}

export function hplApplicationLabel(
  value: string | null | undefined,
  messages: Messages = getActiveMessages(),
): string {
  const canonical = toCanonicalHplApplication(value);
  if (canonical) {
    return messages.hpl.applications[canonical];
  }

  return value?.trim() || messages.common.dash;
}

export function panelTypeLabel(
  type?: {
    code?: string | null;
    displayNameRu?: string | null;
    name?: string | null;
  } | null,
  messages: Messages = getActiveMessages(),
): string {
  const fromCode = applicationFromPanelTypeCode(type?.code);
  if (fromCode) {
    return messages.hpl.applications[fromCode];
  }

  const named = type?.displayNameRu?.trim() || type?.name?.trim();
  if (named) {
    return localizeSystemText(named, messages);
  }

  return type?.code?.trim() || messages.common.dash;
}

export type PanelSizeLike = {
  id?: string;
  widthMm?: number | string | null;
  heightMm?: number | string | null;
  displayName?: string | null;
  areaM2?: number | string | null;
  width?: number | string | null;
  length?: number | string | null;
  label?: string | null;
};

export function panelSizeLabel(
  size?: PanelSizeLike | null,
  messages: Messages = getActiveMessages(),
): string {
  const displayName = size?.displayName?.trim();
  if (displayName) {
    return displayName;
  }

  const width = toDecimalNumber(size?.widthMm ?? size?.width);
  const height = toDecimalNumber(size?.heightMm ?? size?.length);
  if (width && height) {
    return interpolate(messages.hpl.sizeMm, { width, height });
  }

  return size?.label?.trim() || messages.common.dash;
}

export function resolveSheetAreaM2(size?: PanelSizeLike | null): number | null {
  const fromSize = toDecimalNumber(size?.areaM2);
  if (fromSize !== null && fromSize > 0) {
    return fromSize;
  }

  const width = toDecimalNumber(size?.widthMm ?? size?.width);
  const height = toDecimalNumber(size?.heightMm ?? size?.length);
  if (width !== null && height !== null && width > 0 && height > 0) {
    return (width * height) / 1_000_000;
  }

  return null;
}

export function toDecimalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') {
    return null;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === 'object') {
    if (typeof (value as { toNumber?: unknown }).toNumber === 'function') {
      const parsed = (value as { toNumber: () => unknown }).toNumber();
      return toDecimalNumber(parsed);
    }

    const asString = String(value);
    if (asString && asString !== '[object Object]') {
      return toDecimalNumber(asString);
    }
  }

  return null;
}

export function formatDecimalDisplay(
  value: unknown,
  fallback?: string,
  messages: Messages = getActiveMessages(),
): string {
  const parsed = toDecimalNumber(value);
  if (parsed === null) {
    return fallback ?? messages.common.dash;
  }

  return String(parsed);
}

export function formatThicknessMm(
  value: unknown,
  messages: Messages = getActiveMessages(),
): string {
  const parsed = toDecimalNumber(value);
  if (parsed === null) {
    return messages.common.dash;
  }

  return interpolate(messages.common.mm, { value: parsed });
}

export function formatAreaM2(
  value: unknown,
  messages: Messages = getActiveMessages(),
): string {
  const parsed = toDecimalNumber(value);
  if (parsed === null) {
    return messages.common.dash;
  }

  return interpolate(messages.common.m2, { value: parsed });
}

export function isFurnitureApplication(
  application: string | null | undefined,
): boolean {
  return toCanonicalHplApplication(application) === 'FURNITURE';
}

export function usesDiscreteThickness(
  application: string | null | undefined,
): boolean {
  const canonical = toCanonicalHplApplication(application);
  return (
    canonical === 'INTERIOR' ||
    canonical === 'EXTERIOR_WITH_UV' ||
    canonical === 'LABORATORY'
  );
}

export function isDiscreteThicknessValue(value: number): boolean {
  return STANDARD_DISCRETE_THICKNESSES_MM.some((item) => item === value);
}

export function isValidFurnitureThickness(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= FURNITURE_THICKNESS_MIN_MM &&
    value <= FURNITURE_THICKNESS_MAX_MM
  );
}

export function isValidThicknessForApplication(
  application: string | null | undefined,
  value: unknown,
): boolean {
  const thickness = toDecimalNumber(value);
  if (thickness === null) {
    return false;
  }

  if (isFurnitureApplication(application)) {
    return isValidFurnitureThickness(thickness);
  }

  if (usesDiscreteThickness(application)) {
    return isDiscreteThicknessValue(thickness);
  }

  return thickness > 0;
}

export function thicknessValidationMessage(
  application: string | null | undefined,
  value: unknown,
  messages: Messages = getActiveMessages(),
): string | null {
  const thickness = toDecimalNumber(value);
  if (thickness === null || thickness <= 0) {
    return messages.validation.thicknessRequired;
  }

  if (isFurnitureApplication(application)) {
    return isValidFurnitureThickness(thickness)
      ? null
      : messages.validation.furnitureThickness;
  }

  if (usesDiscreteThickness(application) && !isDiscreteThicknessValue(thickness)) {
    return messages.validation.thicknessFromList;
  }

  return null;
}

export function formatColorLabel(
  color?: {
    colorCode?: string | null;
    colorName?: string | null;
  } | null,
  messages: Messages = getActiveMessages(),
): string {
  const parts = [color?.colorCode, color?.colorName]
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item));

  return parts.length > 0 ? parts.join(' · ') : messages.common.dash;
}

export function formatQualificationSize(
  qualification?: {
    panelSizeId?: string | null;
    customWidthMm?: number | string | null;
    customHeightMm?: number | string | null;
    panelSize?: PanelSizeLike | null;
  } | null,
  messages: Messages = getActiveMessages(),
): string {
  const customWidth = toDecimalNumber(qualification?.customWidthMm);
  const customHeight = toDecimalNumber(qualification?.customHeightMm);
  if (customWidth !== null && customHeight !== null && customWidth > 0 && customHeight > 0) {
    return interpolate(messages.hpl.customSizeLabel, {
      width: customWidth,
      height: customHeight,
    });
  }

  return panelSizeLabel(qualification?.panelSize, messages);
}

export function resolveSizeMode(qualification?: {
  panelSizeId?: string | null;
  customWidthMm?: number | string | null;
  customHeightMm?: number | string | null;
} | null): SizeMode {
  const customWidth = toDecimalNumber(qualification?.customWidthMm);
  const customHeight = toDecimalNumber(qualification?.customHeightMm);
  if (customWidth !== null && customHeight !== null && customWidth > 0 && customHeight > 0) {
    return 'CUSTOM';
  }

  return 'STANDARD';
}

export type QualificationSizePayload = {
  panelSizeId?: string;
  customWidthMm?: number;
  customHeightMm?: number;
};

export function buildSizePayload(input: {
  sizeMode: SizeMode;
  panelSizeId?: string | null;
  customWidthMm?: unknown;
  customHeightMm?: unknown;
}): QualificationSizePayload {
  if (input.sizeMode === 'CUSTOM') {
    const customWidthMm = toDecimalNumber(input.customWidthMm);
    const customHeightMm = toDecimalNumber(input.customHeightMm);
    return {
      ...(customWidthMm !== null ? { customWidthMm } : {}),
      ...(customHeightMm !== null ? { customHeightMm } : {}),
    };
  }

  const panelSizeId = input.panelSizeId?.trim();
  return panelSizeId ? { panelSizeId } : {};
}

export function isOtherPanelType(type?: {
  code?: string | null;
  displayNameRu?: string | null;
  name?: string | null;
} | null): boolean {
  const code = type?.code?.trim().toLowerCase() ?? '';
  if (code === 'other' || code === 'custom') {
    return true;
  }

  const named = (
    type?.displayNameRu?.trim() ||
    type?.name?.trim() ||
    ''
  ).toLowerCase();
  return named === 'другой' || named === 'другое';
}

export function findPanelTypeIdByApplication<T extends { id: string; code: string }>(
  types: T[],
  application: string | null | undefined,
): string | null {
  const expectedCode = panelTypeCodeFromApplication(application);
  if (!expectedCode) {
    return null;
  }

  return types.find((type) => normalizePanelTypeCode(type.code) === expectedCode)?.id ?? null;
}
