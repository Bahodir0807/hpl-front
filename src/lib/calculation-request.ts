import type {
  CalculationItem,
  CalculationRequest,
  CalculationSession,
  LeadQualification,
  QualityClass,
} from "@/types/hpl";
import {
  formatColorLabel,
  isOtherPanelType,
  isValidThicknessForApplication,
  panelTypeCodeFromApplication,
  toCanonicalHplApplication,
  toDecimalNumber,
} from "@/lib/hpl-domain";
import {
  CALCULATIONS_READ_PERMISSION,
  QUOTES_APPROVE_PERMISSION,
  canCreateCalculationRequest,
  canShowCreateCalculationRequestAction,
  canShowSubmitCalculationRequestToHead,
  canSubmitCalculationRequest,
} from "@/lib/calculation-presentation";

export {
  canCreateCalculationRequest,
  canShowCreateCalculationRequestAction,
  canShowSubmitCalculationRequestToHead,
  canSubmitCalculationRequest,
};

export const SUBMIT_TO_HEAD_LABEL = "Отправить руководителю";
export const CREATE_CALCULATION_REQUEST_LABEL = "Создать запрос расчёта";
export const ADD_CALCULATION_LABEL = "+ Добавить расчёт";
export const ADD_HPL_ROW_LABEL = "+ Добавить HPL-панель";
export const CONVERT_REQUEST_TO_QUOTE_LABEL = "Создать черновик КП";
export const CUSTOM_TYPE_DESCRIPTION_LABEL = "Описание нестандартного типа";
export const CUSTOM_TYPE_DESCRIPTION_REQUIRED_MESSAGE =
  "Для типа «Другой» укажите описание";
export const HALF_FILLED_CUSTOM_SIZE_MESSAGE = "Укажите ширину и высоту вместе";
export const CUSTOM_SIZE_INTEGER_MESSAGE =
  "Ширина и высота должны быть целыми числами не меньше 1 мм";
export const CUSTOM_SIZE_SNAPSHOT_HINT =
  "Нестандартный размер сохраняется как снимок. Для текущего расчёта цены нужен стандартный размер.";
export const SHEETS_COUNT_PLACEHOLDER = "—";

export const calculationRequestStatusLabels: Record<string, string> = {
  draft: "Черновик",
  submitted: "Отправлен руководителю",
  processing: "На проверке",
  quoted: "КП создано",
};

export type CalculationRequestItemForm = {
  key: string;
  id?: string;
  qualityClassId: string;
  supplierId: string;
  panelTypeId: string;
  coating: string;
  sizeMode: "STANDARD" | "CUSTOM";
  panelSizeId: string;
  customWidthMm: string;
  customHeightMm: string;
  thicknessMm: string;
  /** GET/persisted backend quantity. Display-only; never serialized. */
  sheetsCount: string;
  requiredAreaM2: string;
  /** Customer color snapshot from Qualification. Serialized separately from Decor. */
  colorName: string;
  colorId: string;
  colorCode: string;
  /** HEAD actual supplier decor. Free text, not a PanelColor catalog id. */
  decor: string;
  texture: string;
  note: string;
  customTypeDescription: string;
};

export type CalculationRequestGroupForm = {
  key: string;
  id?: string;
  title: string;
  items: CalculationRequestItemForm[];
};

export type CalculationRequestFormValues = {
  notes: string;
  calculations: CalculationRequestGroupForm[];
};

export type CalculationRequestItemPayload = {
  panelTypeId?: string;
  supplierId?: string;
  qualityClassId?: string;
  thicknessMm?: string;
  panelSizeId?: string;
  colorId?: string;
  colorCode?: string;
  colorName?: string;
  coating?: string;
  texture?: string;
  decor?: string;
  requiredAreaM2?: string;
  customWidthMm?: number;
  customHeightMm?: number;
  note?: string;
  customTypeDescription?: string;
};

export type CalculationRequestGroupPayload = {
  title?: string;
  items: CalculationRequestItemPayload[];
};

export type CreateCalculationRequestPayload = {
  leadId: string;
  notes?: string;
  calculations: CalculationRequestGroupPayload[];
};

export type PatchCalculationRequestPayload = {
  notes?: string;
  calculations?: CalculationRequestGroupPayload[];
};

export type UpsertCalculationRequestPayload =
  | CreateCalculationRequestPayload
  | (PatchCalculationRequestPayload & {
      calculations: CalculationRequestGroupPayload[];
    });

export const CALCULATION_REQUEST_CREATE_KEYS = [
  "leadId",
  "notes",
  "calculations",
] as const;

export const CALCULATION_REQUEST_PATCH_KEYS = [
  "notes",
  "calculations",
] as const;

export const CALCULATION_REQUEST_GROUP_WRITE_KEYS = ["title", "items"] as const;

export const CALCULATION_REQUEST_ITEM_WRITE_KEYS = [
  "panelTypeId",
  "supplierId",
  "qualityClassId",
  "thicknessMm",
  "panelSizeId",
  "colorId",
  "colorCode",
  "colorName",
  "coating",
  "texture",
  "decor",
  "requiredAreaM2",
  "customWidthMm",
  "customHeightMm",
  "note",
  "customTypeDescription",
] as const;

export type CalculationRequestItemErrors = Partial<
  Record<keyof CalculationRequestItemForm, string>
>;

function hasPermission(
  permissions: readonly string[] | null | undefined,
  slug: string,
): boolean {
  return Boolean(permissions?.includes(slug));
}

export function canViewCalculationRequest(
  permissions: readonly string[] | null | undefined,
): boolean {
  return hasPermission(permissions, CALCULATIONS_READ_PERMISSION);
}

export function canConvertCalculationRequestToQuote(
  permissions: readonly string[] | null | undefined,
): boolean {
  return hasPermission(permissions, QUOTES_APPROVE_PERMISSION);
}

export function canApproveQuotePricing(
  permissions: readonly string[] | null | undefined,
): boolean {
  return hasPermission(permissions, QUOTES_APPROVE_PERMISSION);
}

export function canFinalizeQuote(
  permissions: readonly string[] | null | undefined,
): boolean {
  return hasPermission(permissions, QUOTES_APPROVE_PERMISSION);
}

export function isDraftCalculationRequest(status?: string | null): boolean {
  return status === "draft";
}

export function isSubmittedCalculationRequest(status?: string | null): boolean {
  return status === "submitted" || status === "processing";
}

export function isQuotedCalculationRequest(status?: string | null): boolean {
  return status === "quoted";
}

export function canConvertRequestToQuote(
  request?: {
    status?: string | null;
    quoteId?: string | null;
    quotes?: unknown[] | null;
  } | null,
): boolean {
  if (!request || isQuotedCalculationRequest(request.status)) {
    return false;
  }
  if (!isSubmittedCalculationRequest(request.status)) {
    return false;
  }
  if (request.quoteId) {
    return false;
  }
  if (Array.isArray(request.quotes) && request.quotes.length > 0) {
    return false;
  }
  return true;
}

export function calculationRequestStatusLabel(status?: string | null): string {
  if (!status) {
    return "—";
  }

  return calculationRequestStatusLabels[status] ?? status;
}

export function unwrapRequestCalculations(
  request?: Pick<CalculationRequest, "calculations"> | null,
): CalculationSession[] {
  return request?.calculations ?? [];
}

export function nextClientKey(prefix: string): string {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${id}`;
}

export function toNonNegativeInteger(value: unknown): number | null {
  const parsed = toDecimalNumber(value);
  if (parsed == null || !Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function toPositiveInteger(value: unknown): number | null {
  const parsed = toNonNegativeInteger(value);
  if (parsed == null || parsed < 1) {
    return null;
  }

  return parsed;
}

export type PanelSizeDimensions = {
  widthMm?: number | string | null;
  heightMm?: number | string | null;
};

export function panelAreaM2FromSize(
  size?: PanelSizeDimensions | null,
): number | null {
  const widthMm = toDecimalNumber(size?.widthMm);
  const heightMm = toDecimalNumber(size?.heightMm);
  if (widthMm == null || heightMm == null || widthMm <= 0 || heightMm <= 0) {
    return null;
  }

  return (widthMm / 1000) * (heightMm / 1000);
}

export function previewSheetsCount(
  requiredAreaM2: unknown,
  size?: PanelSizeDimensions | null,
): number | null {
  const area = toDecimalNumber(requiredAreaM2);
  if (area == null || area <= 0) {
    return null;
  }

  const panelAreaM2 = panelAreaM2FromSize(size);
  if (panelAreaM2 == null || panelAreaM2 <= 0) {
    return null;
  }

  return Math.ceil(area / panelAreaM2);
}

export function formatSheetsCountDisplay(
  count: number | null | undefined,
): string {
  if (count == null) {
    return SHEETS_COUNT_PLACEHOLDER;
  }

  return `${count} шт.`;
}

export function requestItemSheetsCountDisplay(
  item: Pick<
    CalculationRequestItemForm,
    "id" | "sheetsCount" | "requiredAreaM2"
  >,
  size?: PanelSizeDimensions | null,
): string {
  const persisted = item.id ? toPositiveInteger(item.sheetsCount) : null;
  if (persisted != null) {
    return formatSheetsCountDisplay(persisted);
  }

  return formatSheetsCountDisplay(
    previewSheetsCount(item.requiredAreaM2, size),
  );
}

export function serializeDecimalInput(
  value: string,
  maxFractionDigits: number,
): string | undefined {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) {
    return undefined;
  }

  const match = trimmed.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) {
    const parsed = toDecimalNumber(trimmed);
    if (parsed == null || parsed < 0) {
      return undefined;
    }
    const [integer, fraction = ""] = String(parsed).split(".");
    return fraction
      ? `${integer}.${fraction.slice(0, maxFractionDigits)}`
      : integer;
  }

  const integer = match[1];
  const fraction = (match[2] ?? "").slice(0, maxFractionDigits);
  return fraction ? `${integer}.${fraction}` : integer;
}

export function parseCustomSizePair(
  widthValue: unknown,
  heightValue: unknown,
): {
  pair: { customWidthMm: number; customHeightMm: number } | null;
  halfFilled: boolean;
  invalid: boolean;
} {
  const widthRaw =
    typeof widthValue === "string" ? widthValue.trim() : widthValue;
  const heightRaw =
    typeof heightValue === "string" ? heightValue.trim() : heightValue;
  const hasWidth = widthRaw !== "" && widthRaw != null;
  const hasHeight = heightRaw !== "" && heightRaw != null;

  if (!hasWidth && !hasHeight) {
    return { pair: null, halfFilled: false, invalid: false };
  }

  if (hasWidth !== hasHeight) {
    return { pair: null, halfFilled: true, invalid: false };
  }

  const customWidthMm = toPositiveInteger(widthRaw);
  const customHeightMm = toPositiveInteger(heightRaw);
  if (customWidthMm == null || customHeightMm == null) {
    return { pair: null, halfFilled: false, invalid: true };
  }

  return {
    pair: { customWidthMm, customHeightMm },
    halfFilled: false,
    invalid: false,
  };
}

export function unknownCalculationRequestWriteKeys(
  payload: Record<string, unknown>,
  mode: "create" | "patch" = "create",
): string[] {
  const unknown: string[] = [];
  const rootAllowed = new Set<string>(
    mode === "create"
      ? CALCULATION_REQUEST_CREATE_KEYS
      : CALCULATION_REQUEST_PATCH_KEYS,
  );

  for (const key of Object.keys(payload)) {
    if (!rootAllowed.has(key)) {
      unknown.push(key);
    }
  }

  const calculations = payload.calculations;
  if (!Array.isArray(calculations)) {
    return unknown;
  }

  const groupAllowed = new Set<string>(CALCULATION_REQUEST_GROUP_WRITE_KEYS);
  const itemAllowed = new Set<string>(CALCULATION_REQUEST_ITEM_WRITE_KEYS);

  calculations.forEach((group, groupIndex) => {
    if (!group || typeof group !== "object") {
      return;
    }

    for (const key of Object.keys(group as object)) {
      if (!groupAllowed.has(key)) {
        unknown.push(`calculations[${groupIndex}].${key}`);
      }
    }

    const items = (group as { items?: unknown }).items;
    if (!Array.isArray(items)) {
      return;
    }

    items.forEach((item, itemIndex) => {
      if (!item || typeof item !== "object") {
        return;
      }

      for (const key of Object.keys(item as object)) {
        if (!itemAllowed.has(key)) {
          unknown.push(
            `calculations[${groupIndex}].items[${itemIndex}].${key}`,
          );
        }
      }
    });
  });

  return unknown;
}

export function createEmptyRequestItem(): CalculationRequestItemForm {
  return {
    key: nextClientKey("item"),
    qualityClassId: "",
    supplierId: "",
    panelTypeId: "",
    coating: "",
    sizeMode: "STANDARD",
    panelSizeId: "",
    customWidthMm: "",
    customHeightMm: "",
    thicknessMm: "",
    sheetsCount: "",
    requiredAreaM2: "",
    colorName: "",
    colorId: "",
    colorCode: "",
    decor: "",
    texture: "",
    note: "",
    customTypeDescription: "",
  };
}

export function createEmptyRequestGroup(
  index = 0,
): CalculationRequestGroupForm {
  return {
    key: nextClientKey("calc"),
    title: `Расчёт №${index + 1}`,
    items: [createEmptyRequestItem()],
  };
}

export function createEmptyRequestForm(): CalculationRequestFormValues {
  return {
    notes: "",
    calculations: [createEmptyRequestGroup(0)],
  };
}

export function duplicateRequestItem(
  item: CalculationRequestItemForm,
  preserveSupplier = true,
): CalculationRequestItemForm {
  return {
    key: nextClientKey("item"),
    qualityClassId: item.qualityClassId,
    supplierId: preserveSupplier ? item.supplierId : "",
    panelTypeId: item.panelTypeId,
    coating: item.coating,
    sizeMode: item.sizeMode,
    panelSizeId: item.panelSizeId,
    customWidthMm: item.customWidthMm,
    customHeightMm: item.customHeightMm,
    thicknessMm: item.thicknessMm,
    sheetsCount: "",
    requiredAreaM2: item.requiredAreaM2,
    colorName: item.colorName,
    colorId: item.colorId,
    colorCode: item.colorCode,
    decor: item.decor,
    texture: item.texture,
    note: item.note,
    customTypeDescription: item.customTypeDescription,
  };
}

export function requestItemColorDisplay(
  item:
    | Pick<CalculationItem, "colorCode" | "colorName" | "color">
    | CalculationRequestItemForm,
): string {
  if ("key" in item) {
    return item.colorName.trim();
  }

  return formatColorLabel({
    colorCode: item.colorCode?.trim() || item.color?.colorCode,
    colorName:
      item.colorName?.trim() ||
      item.color?.colorName?.trim() ||
      item.color?.name?.trim() ||
      "",
  }).replace(/^—$/, "");
}

export function requestItemFromApi(
  item: CalculationItem,
): CalculationRequestItemForm {
  const customWidth = toDecimalNumber(item.customWidthMm);
  const customHeight = toDecimalNumber(item.customHeightMm);
  const hasCustomPair =
    customWidth != null &&
    customHeight != null &&
    customWidth > 0 &&
    customHeight > 0;
  const sheets = toNonNegativeInteger(item.sheetsCount);
  const area = toDecimalNumber(item.requiredAreaM2 ?? item.areaM2);
  const thickness = toDecimalNumber(item.thicknessMm);

  return {
    key: item.id ? `persisted-${item.id}` : nextClientKey("item"),
    id: item.id,
    qualityClassId: item.qualityClassId ?? item.qualityClass?.id ?? "",
    supplierId: item.supplierId ?? item.supplier?.id ?? "",
    panelTypeId: item.panelTypeId ?? item.panelType?.id ?? "",
    coating: item.coating?.trim() ?? "",
    sizeMode: hasCustomPair ? "CUSTOM" : "STANDARD",
    panelSizeId: item.panelSizeId ?? item.panelSize?.id ?? "",
    customWidthMm: customWidth != null ? String(customWidth) : "",
    customHeightMm: customHeight != null ? String(customHeight) : "",
    thicknessMm: thickness != null ? String(thickness) : "",
    sheetsCount: sheets != null ? String(sheets) : "",
    requiredAreaM2: area != null ? String(area) : "",
    colorName: item.colorName?.trim() ?? "",
    colorId: item.colorId?.trim() || item.color?.id?.trim() || "",
    colorCode: item.colorCode?.trim() || item.color?.colorCode?.trim() || "",
    decor: item.decor?.trim() ?? "",
    texture: item.texture?.trim() ?? "",
    note: item.note?.trim() ?? "",
    customTypeDescription: item.customTypeDescription?.trim() ?? "",
  };
}

export function requestFormFromApi(
  request: CalculationRequest,
): CalculationRequestFormValues {
  const groups = unwrapRequestCalculations(request);

  return {
    notes: request.notes ?? "",
    calculations:
      groups.length > 0
        ? groups.map((group, index) => ({
            key: group.id ? `persisted-${group.id}` : nextClientKey("calc"),
            id: group.id,
            title: group.title?.trim() || `Расчёт №${index + 1}`,
            items:
              group.items.length > 0
                ? group.items.map(requestItemFromApi)
                : [createEmptyRequestItem()],
          }))
        : [createEmptyRequestGroup(0)],
  };
}

export function requestFormFromQualification(
  qualification?: LeadQualification | null,
): CalculationRequestFormValues {
  const sourceItems =
    qualification?.items !== undefined
      ? qualification.items
      : qualification
        ? [qualification]
        : [];
  const items = sourceItems.map((item) => {
      const customWidth = toDecimalNumber(item.customWidthMm);
      const customHeight = toDecimalNumber(item.customHeightMm);
      const hasCustomPair =
        customWidth != null &&
        customHeight != null &&
        customWidth > 0 &&
        customHeight > 0;
      const thickness = toDecimalNumber(item.thicknessMm);
      const area = toDecimalNumber(item.requiredAreaM2);

      return {
        ...createEmptyRequestItem(),
        panelTypeId: item.panelTypeId ?? "",
        panelSizeId: item.panelSizeId ?? "",
        sizeMode: (hasCustomPair ? "CUSTOM" : "STANDARD") as
          "STANDARD" | "CUSTOM",
        customWidthMm: customWidth == null ? "" : String(customWidth),
        customHeightMm: customHeight == null ? "" : String(customHeight),
        thicknessMm: thickness == null ? "" : String(thickness),
        requiredAreaM2: area == null ? "" : String(area),
        colorCode: item.colorCode?.trim() ?? "",
        colorName: item.colorName?.trim() ?? "",
        coating:
          "coating" in item ? (item.coating?.trim() ?? "") : "",
        texture:
          "texture" in item ? (item.texture?.trim() ?? "") : "",
      };
    });

  return {
    notes: qualification?.customerRequirements ?? "",
    calculations: [
      {
        key: nextClientKey("calc"),
        title: "Расчёт №1",
        items,
      },
    ],
  };
}

export function qualityClassStillAvailable(
  qualityClassId: string,
  classes: QualityClass[],
): boolean {
  if (!qualityClassId) {
    return true;
  }

  return classes.some((item) => item.id === qualityClassId);
}

export function validateRequestItem(
  item: CalculationRequestItemForm,
  panelType?: {
    id: string;
    code: string;
    displayNameRu?: string | null;
  } | null,
  options: { requireCompleteTechnicalFields?: boolean } = {},
): CalculationRequestItemErrors {
  const errors: CalculationRequestItemErrors = {};
  const application =
    toCanonicalHplApplication(panelType?.code) ??
    panelTypeCodeFromApplication(panelType?.code);
  const requireComplete = options.requireCompleteTechnicalFields !== false;

  if (requireComplete && !item.qualityClassId.trim()) {
    errors.qualityClassId = "Укажите класс";
  }
  if (requireComplete && !item.supplierId.trim()) {
    errors.supplierId = "Укажите поставщика";
  }
  if (requireComplete && !item.panelTypeId.trim()) {
    errors.panelTypeId = "Укажите тип HPL";
  }

  if (
    requireComplete &&
    !isValidThicknessForApplication(application, item.thicknessMm)
  ) {
    errors.thicknessMm = "Укажите толщину";
  }

  if (requireComplete && !item.panelSizeId.trim()) {
    errors.panelSizeId = "Укажите размер";
  }

  const customPair = parseCustomSizePair(
    item.customWidthMm,
    item.customHeightMm,
  );
  if (customPair.halfFilled) {
    errors.customWidthMm = HALF_FILLED_CUSTOM_SIZE_MESSAGE;
    errors.customHeightMm = HALF_FILLED_CUSTOM_SIZE_MESSAGE;
  } else if (customPair.invalid) {
    errors.customWidthMm = CUSTOM_SIZE_INTEGER_MESSAGE;
    errors.customHeightMm = CUSTOM_SIZE_INTEGER_MESSAGE;
  }

  const area = toDecimalNumber(item.requiredAreaM2);
  if (requireComplete && (area == null || area <= 0)) {
    errors.requiredAreaM2 = "Укажите объём м²";
  }

  if (isOtherPanelType(panelType) && !item.customTypeDescription.trim()) {
    errors.customTypeDescription = CUSTOM_TYPE_DESCRIPTION_REQUIRED_MESSAGE;
  }

  return errors;
}

export function validateRequestForm(
  form: CalculationRequestFormValues,
  panelTypes: Array<{
    id: string;
    code: string;
    displayNameRu?: string | null;
  }>,
  options: { requireCompleteTechnicalFields?: boolean } = {},
): {
  valid: boolean;
  itemErrors: Record<string, CalculationRequestItemErrors>;
} {
  const itemErrors: Record<string, CalculationRequestItemErrors> = {};

  if (form.calculations.length === 0) {
    return { valid: false, itemErrors };
  }

  for (const group of form.calculations) {
    if (group.items.length === 0) {
      return { valid: false, itemErrors };
    }

    for (const item of group.items) {
      const panelType = panelTypes.find((type) => type.id === item.panelTypeId);
      const errors = validateRequestItem(item, panelType, options);
      if (Object.keys(errors).length > 0) {
        itemErrors[item.key] = errors;
      }
    }
  }

  return {
    valid: Object.keys(itemErrors).length === 0,
    itemErrors,
  };
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function serializeRequestItem(
  item: CalculationRequestItemForm,
  includeItemSuppliers = true,
): CalculationRequestItemPayload {
  const area = serializeDecimalInput(item.requiredAreaM2, 4);
  const thickness = serializeDecimalInput(item.thicknessMm, 2);
  const customSize = parseCustomSizePair(
    item.customWidthMm,
    item.customHeightMm,
  );

  const payload: CalculationRequestItemPayload = {};
  const panelTypeId = item.panelTypeId.trim();
  if (panelTypeId) {
    payload.panelTypeId = panelTypeId;
  }
  const qualityClassId = item.qualityClassId.trim();
  if (qualityClassId) {
    payload.qualityClassId = qualityClassId;
  }
  if (thickness) {
    payload.thicknessMm = thickness;
  }
  if (area) {
    payload.requiredAreaM2 = area;
  }

  if (item.panelSizeId.trim()) {
    payload.panelSizeId = item.panelSizeId.trim();
  }
  if (includeItemSuppliers && item.supplierId.trim()) {
    payload.supplierId = item.supplierId.trim();
  }
  const colorCode = optionalText(item.colorCode);
  if (colorCode) {
    payload.colorCode = colorCode;
  }
  const colorName = optionalText(item.colorName);
  if (colorName) {
    payload.colorName = colorName;
  }
  const coating = optionalText(item.coating);
  if (coating) {
    payload.coating = coating;
  }
  const texture = optionalText(item.texture);
  if (texture) {
    payload.texture = texture;
  }
  const decor = optionalText(item.decor);
  if (decor) {
    payload.decor = decor;
  }
  if (customSize.pair) {
    payload.customWidthMm = customSize.pair.customWidthMm;
    payload.customHeightMm = customSize.pair.customHeightMm;
  }
  const note = optionalText(item.note);
  if (note) {
    payload.note = note;
  }
  const customTypeDescription = optionalText(item.customTypeDescription);
  if (customTypeDescription) {
    payload.customTypeDescription = customTypeDescription;
  }

  return payload;
}

function serializeCalculationGroups(
  form: CalculationRequestFormValues,
  includeItemSuppliers = true,
): CalculationRequestGroupPayload[] {
  return form.calculations.map((group, index) => ({
    title: group.title.trim() || `Расчёт №${index + 1}`,
    items: group.items.map((item) =>
      serializeRequestItem(item, includeItemSuppliers),
    ),
  }));
}

export function serializeCalculationRequest(
  form: CalculationRequestFormValues,
  context: {
    leadId?: string | null;
    includeItemSuppliers?: boolean;
  } = {},
): UpsertCalculationRequestPayload {
  const notes = form.notes.trim();
  const calculations = serializeCalculationGroups(
    form,
    context.includeItemSuppliers !== false,
  );

  if (context.leadId) {
    return {
      leadId: context.leadId,
      ...(notes ? { notes } : {}),
      calculations,
    };
  }

  return {
    notes,
    calculations,
  };
}

export const LEGACY_CONVERT_TO_QUOTE_PATH =
  "/calculations/:id/convert-to-quote";
export const REQUEST_CONVERT_TO_QUOTE_PATH =
  "/calculations/requests/:id/convert-to-quote";
