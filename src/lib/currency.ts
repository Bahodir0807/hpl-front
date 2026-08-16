export type MoneyCurrency = 'USD' | 'UZS';

export const moneyCurrencyInputLabels: Record<MoneyCurrency, string> = {
  USD: 'USD',
  UZS: 'сум',
};

export function normalizeCurrency(raw?: string | null): MoneyCurrency {
  if (raw?.trim().toUpperCase() === 'USD') {
    return 'USD';
  }

  return 'UZS';
}

function parseMoneyValue(
  value: string | number | null | undefined,
): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isNaN(num) ? null : num;
}

/** Форматирует сумму в указанной валюте без пересчёта. */
export function formatMoney(
  value: string | number | null | undefined,
  currency: MoneyCurrency = 'UZS',
): string {
  const num = parseMoneyValue(value);
  if (num === null) {
    return '—';
  }

  if (currency === 'USD') {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  return `${new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)} сум`;
}
