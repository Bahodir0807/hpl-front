import { AxiosError } from 'axios';
import { localizeHplBusinessError } from './hpl-errors';
import { localizeInstallationError } from './installation-errors';
import { localizeOperationalError } from './operational-errors';
import { localizeSupplierOrderError } from './supplier-order-errors';

export interface ApiError {
  message: string;
  statusCode: number;
  requestId?: string;
}

const DEFAULT_MESSAGE = 'Ошибка сервера';

// Формат NestJS: { statusCode, message: string | string[], requestId? }
export function normalizeError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    if (error.response) {
      const data = error.response.data as Record<string, unknown> | undefined;
      const rawMessage = data?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : typeof rawMessage === 'string'
          ? rawMessage
          : DEFAULT_MESSAGE;

      return {
        message,
        statusCode: error.response.status,
        requestId:
          typeof data?.requestId === 'string' ? data.requestId : undefined,
      };
    }

    // Сетевая ошибка без ответа (backend недоступен, CORS и т.п.)
    return { message: 'Сервер недоступен. Повторите попытку позже.', statusCode: 0 };
  }

  if (error instanceof Error) {
    return { message: error.message, statusCode: 0 };
  }

  return { message: 'Неизвестная ошибка', statusCode: 0 };
}

export function getErrorMessage(error: unknown, fallback?: string): string {
  const localized =
    localizeHplBusinessError(error) ??
    localizeSupplierOrderError(error) ??
    localizeInstallationError(error) ??
    localizeOperationalError(error);
  if (localized) {
    return localized;
  }

  const normalized = normalizeError(error);

  if (fallback && normalized.message === DEFAULT_MESSAGE) {
    return fallback;
  }

  return normalized.message;
}
