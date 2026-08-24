import { AxiosError } from 'axios';
import {
  DISTINCT_INSTALLATION_ACTORS_COPY,
  INSTALLATION_NOT_FOUND_MESSAGE,
  MATERIAL_NOT_DELIVERED_MESSAGE,
} from './installation-presentation';

export const INSTALLATION_FORBIDDEN_MESSAGE =
  'Недостаточно прав для этого действия.';

export const INSTALLATION_NOT_REQUIRED_ERROR =
  'Для этой сделки монтаж не требуется.';

export const INSTALLATION_ALREADY_COMPLETED_MESSAGE =
  'Монтаж уже завершён.';

export const INSTALLATION_INVALID_TRANSITION_MESSAGE =
  'Это действие недоступно при текущем статусе монтажа.';

export const INSTALLATION_STALE_STATE_MESSAGE =
  'Состояние монтажа изменилось. Обновите данные и повторите действие.';

export const INSTALLATION_MISSING_INSTALLER_CONFIRM_MESSAGE =
  'Сначала нужно подтверждение монтажника.';

export const INSTALLATION_LOAD_ERROR_MESSAGE =
  'Не удалось загрузить монтажные работы.';

const EXACT_MESSAGE_MAP: Record<string, string> = {
  'Installation completion requires two distinct users':
    DISTINCT_INSTALLATION_ACTORS_COPY,
  'Installation is not required for this deal': INSTALLATION_NOT_REQUIRED_ERROR,
  'Cannot change installation dates after completion':
    INSTALLATION_ALREADY_COMPLETED_MESSAGE,
  'Cannot start installation after completion':
    INSTALLATION_ALREADY_COMPLETED_MESSAGE,
  'Installation work confirmation requires the INSTALLER role':
    INSTALLATION_FORBIDDEN_MESSAGE,
  'Installation dates may be set only by HEAD or DIRECTOR':
    INSTALLATION_FORBIDDEN_MESSAGE,
  'Installation supervisor confirmation requires HEAD or DIRECTOR':
    INSTALLATION_FORBIDDEN_MESSAGE,
  'Installation assessment requires INSTALLER, HEAD, or DIRECTOR':
    INSTALLATION_FORBIDDEN_MESSAGE,
  'expectedCompletionAt must not precede expectedInstallationAt':
    'Дата окончания монтажа не может быть раньше даты начала.',
  'Installation job not found': INSTALLATION_NOT_FOUND_MESSAGE,
  'Installer confirmation was not recorded': INSTALLATION_STALE_STATE_MESSAGE,
  'Supervisor confirmation was not recorded': INSTALLATION_STALE_STATE_MESSAGE,
  'Installation was not started': INSTALLATION_STALE_STATE_MESSAGE,
  'Access to this deal is forbidden': INSTALLATION_FORBIDDEN_MESSAGE,
};

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

function looksLikeDistinctActors(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('two distinct') ||
    normalized.includes('distinct users') ||
    normalized.includes('same user')
  );
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
    normalized.includes('cannot start installation') ||
    normalized.includes('cannot change installation')
  );
}

function looksLikeMissingInstallerConfirm(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('installer confirmation') &&
    (normalized.includes('missing') ||
      normalized.includes('required') ||
      normalized.includes('pending') ||
      normalized.includes('before'))
  );
}

export function localizeInstallationError(error: unknown): string | null {
  const { tokens } = collectTokens(error);

  for (const token of tokens) {
    if (EXACT_MESSAGE_MAP[token]) {
      return EXACT_MESSAGE_MAP[token];
    }
  }

  const joined = tokens.join(' ');
  if (looksLikeDistinctActors(joined)) {
    return DISTINCT_INSTALLATION_ACTORS_COPY;
  }
  if (looksLikeMaterialGate(joined)) {
    return MATERIAL_NOT_DELIVERED_MESSAGE;
  }
  if (looksLikeNotRequired(joined)) {
    return INSTALLATION_NOT_REQUIRED_ERROR;
  }
  if (looksLikeAlreadyCompleted(joined)) {
    return INSTALLATION_ALREADY_COMPLETED_MESSAGE;
  }
  if (looksLikeMissingInstallerConfirm(joined)) {
    return INSTALLATION_MISSING_INSTALLER_CONFIRM_MESSAGE;
  }
  if (looksLikeInvalidTransition(joined)) {
    return INSTALLATION_INVALID_TRANSITION_MESSAGE;
  }

  return null;
}

export function getInstallationErrorMessage(error: unknown): string {
  const localized = localizeInstallationError(error);
  if (localized) {
    return localized;
  }

  if (error instanceof AxiosError) {
    if (error.response?.status === 403) {
      return INSTALLATION_FORBIDDEN_MESSAGE;
    }
    if (error.response?.status === 409) {
      return INSTALLATION_STALE_STATE_MESSAGE;
    }
  }

  const { tokens } = collectTokens(error);
  const first = tokens.find((token) => token && !EXACT_MESSAGE_MAP[token]);
  return first || 'Не удалось выполнить действие с монтажом.';
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
