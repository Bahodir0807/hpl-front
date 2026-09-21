import { AxiosError } from 'axios';
import { getActiveMessages } from '@/i18n/active-messages';
import type { Messages } from '@/i18n/types';

function errorCode(error: unknown): string | null {
  if (!(error instanceof AxiosError)) {
    return null;
  }
  const data = error.response?.data;
  if (!data || typeof data !== 'object') {
    return null;
  }
  const code = (data as { errorCode?: unknown }).errorCode;
  return typeof code === 'string' ? code : null;
}

export function localizeEngineeringError(
  error: unknown,
  messages: Messages = getActiveMessages(),
): string | null {
  const code = errorCode(error);
  if (!code) {
    return null;
  }

  const map: Record<string, string> = {
    FACADE_RECALC_CONFIRMATION_REQUIRED: messages.engineering.facadeRecalcConfirm,
    FACADE_REVISION_CONFLICT: messages.engineering.facadeRevisionConflict,
    FACADE_NOT_APPLICABLE: messages.engineering.facadeNotApplicable,
    FACADE_EDIT_FORBIDDEN: messages.engineering.facadeEditForbidden,
    FACADE_CONFIG_UNKNOWN: messages.engineering.facadeConfigUnknown,
    FACADE_AREA_INVALID: messages.engineering.facadeAreaInvalid,
    FACADE_QTY_INVALID: messages.engineering.facadeQtyInvalid,
    FACADE_MATERIAL_UNKNOWN: messages.engineering.facadeMaterialUnknown,
    FACADE_CALCULATION_NOT_FOUND: messages.engineering.facadeNotFound,
  };

  return map[code] ?? null;
}

export function isFacadeRecalcConfirmation(error: unknown): boolean {
  return errorCode(error) === 'FACADE_RECALC_CONFIRMATION_REQUIRED';
}
