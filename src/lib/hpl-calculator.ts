import {
  buildSizePayload,
  findPanelTypeIdByApplication,
  isValidThicknessForApplication,
  resolveSizeMode,
  SizeMode,
  toCanonicalHplApplication,
  toDecimalNumber,
  type HplApplication,
} from './hpl-domain';

export type CalculatorPrefillSource = {
  application?: string | null;
  panelTypeId?: string | null;
  panelType?: { id?: string; code?: string | null; displayNameRu?: string | null } | null;
  thicknessMm?: number | string | null;
  panelSizeId?: string | null;
  panelSize?: {
    displayName?: string | null;
    widthMm?: number | null;
    heightMm?: number | null;
  } | null;
  customWidthMm?: number | string | null;
  customHeightMm?: number | string | null;
  colorCode?: string | null;
  colorName?: string | null;
  requiredAreaM2?: number | string | null;
  installationRequired?: boolean | null;
};

export type CalculatorPrefill = {
  application: HplApplication | null;
  panelTypeId: string;
  thicknessMm: number | null;
  sizeMode: SizeMode;
  panelSizeId: string;
  customWidthMm: string;
  customHeightMm: string;
  colorCode: string;
  colorName: string;
  requiredAreaM2: string;
};

export function prefillCalculatorFromQualification(
  qualification?: CalculatorPrefillSource | null,
  panelTypes: Array<{ id: string; code: string }> = [],
): CalculatorPrefill {
  const application =
    toCanonicalHplApplication(qualification?.application) ??
    toCanonicalHplApplication(qualification?.panelType?.code) ??
    null;
  const mappedPanelTypeId = findPanelTypeIdByApplication(panelTypes, application);
  const sizeMode = resolveSizeMode(qualification);
  const thicknessMm = toDecimalNumber(qualification?.thicknessMm);
  const customWidth = toDecimalNumber(qualification?.customWidthMm);
  const customHeight = toDecimalNumber(qualification?.customHeightMm);
  const requiredArea = toDecimalNumber(qualification?.requiredAreaM2);

  return {
    application,
    panelTypeId:
      qualification?.panelTypeId ??
      qualification?.panelType?.id ??
      mappedPanelTypeId ??
      '',
    thicknessMm,
    sizeMode,
    panelSizeId: sizeMode === 'STANDARD' ? (qualification?.panelSizeId ?? '') : '',
    customWidthMm: customWidth !== null ? String(customWidth) : '',
    customHeightMm: customHeight !== null ? String(customHeight) : '',
    colorCode: qualification?.colorCode?.trim() ?? '',
    colorName: qualification?.colorName?.trim() ?? '',
    requiredAreaM2: requiredArea !== null ? String(requiredArea) : '',
  };
}

export type CalculationSizeFields = {
  panelSizeId?: string;
  customWidthMm?: number;
  customHeightMm?: number;
};

export function buildCalculationSizeFields(input: {
  sizeMode: SizeMode;
  panelSizeId?: string | null;
  customWidthMm?: unknown;
  customHeightMm?: unknown;
}): CalculationSizeFields {
  return buildSizePayload(input);
}

export function canSubmitCalculationGeometry(input: {
  panelTypeId?: string | null;
  application?: string | null;
  thicknessMm?: unknown;
  sizeMode: SizeMode;
  panelSizeId?: string | null;
  customWidthMm?: unknown;
  customHeightMm?: unknown;
  requiredAreaM2?: unknown;
}): boolean {
  if (!input.panelTypeId) {
    return false;
  }

  if (!isValidThicknessForApplication(input.application, input.thicknessMm)) {
    return false;
  }

  const area = toDecimalNumber(input.requiredAreaM2);
  if (area === null || area <= 0) {
    return false;
  }

  if (input.sizeMode === 'STANDARD') {
    return Boolean(input.panelSizeId?.trim());
  }

  const width = toDecimalNumber(input.customWidthMm);
  const height = toDecimalNumber(input.customHeightMm);
  return width !== null && height !== null && width > 0 && height > 0;
}
