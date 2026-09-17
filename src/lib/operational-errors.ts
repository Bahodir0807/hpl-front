import { AxiosError } from 'axios';
import { ru } from '@/i18n/ru';
import { getActiveMessages } from '@/i18n/active-messages';
import type { Messages } from '@/i18n/types';

export const FORBIDDEN_ACTION_MESSAGE = ru.errors.forbidden;

export const INVALID_DEAL_TRANSITION_MESSAGE = ru.errors.invalidDealTransition;

export const QUOTE_PDF_FAILED_MESSAGE = ru.errors.quotePdfFailed;

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

export function localizeOperationalError(
  error: unknown,
  messages: Messages = getActiveMessages(),
): string | null {
  const joined = collectMessages(error).join(' ').toLowerCase();

  if (
    joined.includes('cannot change stage') ||
    joined.includes('invalid stage transition') ||
    joined.includes('invalid deal stage')
  ) {
    return messages.errors.invalidDealTransition;
  }

  if (error instanceof AxiosError && error.response?.status === 403) {
    return messages.errors.forbidden;
  }

  if (
    joined.includes('failed to download') ||
    (joined.includes('quote') && joined.includes('pdf') && joined.includes('fail'))
  ) {
    return messages.errors.quotePdfFailed;
  }

  return null;
}
