export const QUALITY_LINE_LABELS: Record<string, string> = {
  economy: 'Эконом',
  econom: 'Эконом',
  medium: 'Медиум',
  premium: 'Премиум',
};

export const QUALITY_LINE_PLACEHOLDER = 'Выберите линейку';

export const QUALITY_LINES_NOT_FOUND = 'Линейки не найдены';

export const QUALITY_LINES_EMPTY_MESSAGE =
  'Для выбранного поставщика и типа HPL не настроена доступная линейка.';

export const QUALITY_LINES_LOAD_ERROR_MESSAGE =
  'Не удалось загрузить линейки продукции.';

export function qualityLineLabel(item: {
  code?: string | null;
  nameRu?: string | null;
  name?: string | null;
  displayName?: string | null;
}): string {
  const code = item.code?.trim().toLowerCase() ?? '';
  if (code && QUALITY_LINE_LABELS[code]) {
    return QUALITY_LINE_LABELS[code];
  }

  const named = item.nameRu?.trim() || item.name?.trim() || item.displayName?.trim();
  if (named) {
    const normalized = named.toLowerCase();
    if (QUALITY_LINE_LABELS[normalized]) {
      return QUALITY_LINE_LABELS[normalized];
    }
    return named;
  }

  return code || '—';
}
