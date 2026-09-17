import { INTL_LOCALES, type Locale } from '@/i18n/config';
import { getActiveLocale } from '@/i18n/active-messages';

/**
 * Число без валюты: количество, м², проценты → "1 234,56"
 */
export function formatNumber(
  value: string | number | null | undefined,
  locale: Locale = getActiveLocale(),
): string {
  if (value === undefined || value === null || value === '') {
    return '—';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) {
    return '—';
  }

  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    maximumFractionDigits: 2,
  }).format(num);
}

/** Дата: locale-aware presentation of a stored date. */
export function formatDate(
  value: string | Date | null | undefined,
  locale: Locale = getActiveLocale(),
): string {
  if (!value) {
    return '—';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** YYYY-MM-DD for native `<input type="date">` values. */
export function toDateInputValue(
  value: string | Date | null | undefined,
): string {
  if (!value) {
    return '';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Convert a YYYY-MM-DD date input into an ISO DateTime at local midnight. */
export function dateInputToIso(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day).toISOString();
}

/** Дата + время: locale-aware presentation of a stored DateTime. */
export function formatDateTime(
  value: string | Date | null | undefined,
  locale: Locale = getActiveLocale(),
): string {
  if (!value) {
    return '—';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
