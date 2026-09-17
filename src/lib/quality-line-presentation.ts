import { getActiveMessages } from '@/i18n/active-messages';
import { localizeSystemText } from '@/i18n/system-labels';
import { ru } from '@/i18n/ru';
import type { Messages } from '@/i18n/types';

function qualityLineLabelMap(messages: Messages): Record<string, string> {
  return {
    economy: messages.hpl.qualityLines.economy,
    econom: messages.hpl.qualityLines.economy,
    medium: messages.hpl.qualityLines.medium,
    premium: messages.hpl.qualityLines.premium,
  };
}

export const QUALITY_LINE_LABELS: Record<string, string> =
  qualityLineLabelMap(ru);

export const QUALITY_LINE_PLACEHOLDER = ru.hpl.qualityLinePlaceholder;

export const QUALITY_LINES_NOT_FOUND = ru.hpl.qualityLinesNotFound;

export const QUALITY_LINES_EMPTY_MESSAGE = ru.hpl.qualityLinesEmpty;

export const QUALITY_LINES_LOAD_ERROR_MESSAGE = ru.hpl.qualityLinesLoadError;

export function qualityLineLabel(
  item: {
    code?: string | null;
    nameRu?: string | null;
    name?: string | null;
    displayName?: string | null;
  },
  messages: Messages = getActiveMessages(),
): string {
  const labels = qualityLineLabelMap(messages);
  const code = item.code?.trim().toLowerCase() ?? '';
  if (code && labels[code]) {
    return labels[code];
  }

  const named =
    item.nameRu?.trim() || item.name?.trim() || item.displayName?.trim();
  if (named) {
    const normalized = named.toLowerCase();
    if (labels[normalized]) {
      return labels[normalized];
    }
    return localizeSystemText(named, messages);
  }

  return code || messages.common.dash;
}
