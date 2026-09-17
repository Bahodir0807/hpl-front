import { AxiosError } from 'axios';
import { ru } from '@/i18n/ru';
import { getActiveMessages } from '@/i18n/active-messages';
import type { Messages } from '@/i18n/types';

export const INSTALLATION_FORBIDDEN_MESSAGE = ru.errors.installationForbidden;

export const INSTALLATION_NOT_REQUIRED_ERROR = ru.errors.installationNotRequired;

export const INSTALLATION_ALREADY_COMPLETED_MESSAGE =
  ru.errors.installationAlreadyCompleted;

export const INSTALLATION_INVALID_TRANSITION_MESSAGE =
  ru.errors.installationInvalidTransition;

export const INSTALLATION_STALE_STATE_MESSAGE = ru.errors.installationStale;

export const INSTALLATION_LOAD_ERROR_MESSAGE = ru.errors.installationLoad;

function exactMessageMap(messages: Messages): Record<string, string> {
  return {
    'Installation is not required for this deal':
      messages.errors.installationNotRequired,
    'Cannot change installation dates after completion':
      messages.errors.installationAlreadyCompleted,
    'Installation dates may be set only by HEAD or DIRECTOR':
      messages.errors.installationForbidden,
    'Installation supervisor confirmation requires HEAD or DIRECTOR':
      messages.errors.installationForbidden,
    'Installation assessment requires HEAD or DIRECTOR':
      messages.errors.installationForbidden,
    'expectedCompletionAt must not precede expectedInstallationAt':
      messages.errors.installationEndBeforeStart,
    'Installation job not found': messages.errors.installationNotFound,
    'Supervisor confirmation was not recorded':
      messages.errors.installationStale,
    'Access to this deal is forbidden': messages.errors.installationForbidden,
  };
}

const EXACT_MESSAGE_MAP = exactMessageMap(ru);

function pushToken(tokens: string[], value: unknown): void {
  if (typeof value === 'string' && value.trim()) {
    tokens.push(value.trim());
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      pushToken(tokens, item);
    }
  }
}

function collectTokens(error: unknown): {
  status: number | null;
  tokens: string[];
} {
  const tokens: string[] = [];
  let status: number | null = null;

  if (error instanceof AxiosError) {
    status = error.response?.status ?? null;
    const data = error.response?.data;
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      pushToken(tokens, record.code);
      pushToken(tokens, record.errorCode);
      pushToken(tokens, record.error);
      pushToken(tokens, record.message);
      if (record.error && typeof record.error === 'object') {
        const nested = record.error as Record<string, unknown>;
        pushToken(tokens, nested.code);
        pushToken(tokens, nested.errorCode);
        pushToken(tokens, nested.message);
      }
    } else if (typeof error.message === 'string') {
      tokens.push(error.message);
    }
  } else if (error instanceof Error) {
    tokens.push(error.message);
  } else if (typeof error === 'string') {
    tokens.push(error);
  }

  return { status, tokens };
}

function looksLikeMaterialGate(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    (normalized.includes('material') && normalized.includes('deliver')) ||
    (normalized.includes('client delivery') &&
      (normalized.includes('not') || normalized.includes('before'))) ||
    normalized.includes('not been delivered') ||
    normalized.includes('материал ещё не доставлен')
  );
}

function looksLikeNotRequired(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('installation is not required') ||
    normalized.includes('installation not required')
  );
}

function looksLikeAlreadyCompleted(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('after completion') ||
    (normalized.includes('already') && normalized.includes('complet'))
  );
}

function looksLikeInvalidTransition(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('invalid installation status') ||
    normalized.includes('cannot change installation')
  );
}

export function localizeInstallationError(
  error: unknown,
  messages: Messages = getActiveMessages(),
): string | null {
  const map = exactMessageMap(messages);
  const { tokens } = collectTokens(error);

  for (const token of tokens) {
    if (map[token]) {
      return map[token];
    }
  }

  const joined = tokens.join(' ');
  if (looksLikeMaterialGate(joined)) {
    return messages.errors.materialNotDelivered;
  }
  if (looksLikeNotRequired(joined)) {
    return messages.errors.installationNotRequired;
  }
  if (looksLikeAlreadyCompleted(joined)) {
    return messages.errors.installationAlreadyCompleted;
  }
  if (looksLikeInvalidTransition(joined)) {
    return messages.errors.installationInvalidTransition;
  }

  return null;
}

export function getInstallationErrorMessage(
  error: unknown,
  messages: Messages = getActiveMessages(),
): string {
  const localized = localizeInstallationError(error, messages);
  if (localized) {
    return localized;
  }

  if (error instanceof AxiosError) {
    if (error.response?.status === 403) {
      return messages.errors.installationForbidden;
    }
    if (error.response?.status === 409) {
      return messages.errors.installationStale;
    }
  }

  const { tokens } = collectTokens(error);
  const first = tokens.find((token) => token && !EXACT_MESSAGE_MAP[token]);
  return first || messages.errors.installationFailed;
}

export function isInstallationConflictError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 409;
}

export function isInstallationForbiddenError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 403;
}

export function isInstallationNotFoundError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 404;
}
