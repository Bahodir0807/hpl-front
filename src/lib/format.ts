/**
 * Число без валюты: количество, м², проценты → "1 234,56"
 */
export function formatNumber(value: string | number | null | undefined): string {
  if (value === undefined || value === null || value === '') {
    return '—';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) {
    return '—';
  }

  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
  }).format(num);
}

/** Дата: ДД.ММ.ГГГГ */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** Дата + время: ДД.ММ.ГГГГ, ЧЧ:ММ (24 часа) */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
