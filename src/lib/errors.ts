import { AxiosError } from 'axios';
import { getActiveMessages } from '@/i18n/active-messages';
import type { Messages } from '@/i18n/types';
import { localizeHplBusinessError } from './hpl-errors';
import { localizeInstallationError } from './installation-errors';
import { localizeOperationalError } from './operational-errors';
import { localizeSupplierOrderError } from './supplier-order-errors';

export interface ApiError {
  message: string;
  statusCode: number;
  requestId?: string;
}

function messagesOrDefault(messages?: Messages): Messages {
  return messages ?? getActiveMessages();
}

// Формат NestJS: { statusCode, message: string | string[], requestId? }
export function normalizeError(error: unknown, messages?: Messages): ApiError {
  const catalog = messagesOrDefault(messages);
  const defaultMessage = catalog.errors.server;

  if (error instanceof AxiosError) {
    if (error.response) {
      const data = error.response.data as Record<string, unknown> | undefined;
      const rawMessage = data?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : typeof rawMessage === 'string'
          ? rawMessage
          : defaultMessage;

      return {
        message,
        statusCode: error.response.status,
        requestId:
          typeof data?.requestId === 'string' ? data.requestId : undefined,
      };
    }

    // Сетевая ошибка без ответа (backend недоступен, CORS и т.п.)
    return { message: catalog.errors.unavailable, statusCode: 0 };
  }

  if (error instanceof Error) {
    return { message: error.message, statusCode: 0 };
  }

  return { message: catalog.errors.unknown, statusCode: 0 };
}

export function getErrorMessage(
  error: unknown,
  fallback?: string,
  messages?: Messages,
): string {
  const catalog = messagesOrDefault(messages);
  const localized =
    localizeHplBusinessError(error, catalog) ??
    localizeSupplierOrderError(error, catalog) ??
    localizeInstallationError(error, catalog) ??
    localizeOperationalError(error, catalog);
  if (localized) {
    return localized;
  }

  const normalized = normalizeError(error, catalog);

  if (fallback && normalized.message === catalog.errors.server) {
    return fallback;
  }

  return normalized.message;
}
