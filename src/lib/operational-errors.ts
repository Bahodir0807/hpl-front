import { AxiosError } from 'axios';

export const FORBIDDEN_ACTION_MESSAGE =
  'Недостаточно прав для этого действия.';

export const INVALID_DEAL_TRANSITION_MESSAGE =
  'Этот переход этапа сделки недоступен.';

export const QUOTE_PDF_FAILED_MESSAGE = 'Не удалось скачать КП.';

function collectMessages(error: unknown): string[] {
  const tokens: string[] = [];
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      if (typeof record.message === 'string') {
        tokens.push(record.message);
      }
      if (Array.isArray(record.message)) {
        tokens.push(...record.message.filter((item) => typeof item === 'string'));
      }
    }
    if (typeof error.message === 'string') {
      tokens.push(error.message);
    }
    return tokens;
  }

  if (error instanceof Error) {
    tokens.push(error.message);
  }

  return tokens;
}

export function localizeOperationalError(error: unknown): string | null {
  const joined = collectMessages(error).join(' ').toLowerCase();

  if (
    joined.includes('cannot change stage') ||
    joined.includes('invalid stage transition') ||
    joined.includes('invalid deal stage')
  ) {
    return INVALID_DEAL_TRANSITION_MESSAGE;
  }

  if (error instanceof AxiosError && error.response?.status === 403) {
    return FORBIDDEN_ACTION_MESSAGE;
  }

  if (
    joined.includes('failed to download') ||
    (joined.includes('quote') && joined.includes('pdf') && joined.includes('fail'))
  ) {
    return QUOTE_PDF_FAILED_MESSAGE;
  }

  return null;
}
