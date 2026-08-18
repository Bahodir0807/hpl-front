import type { Quote, QuoteItem, QuoteStatus } from '@/types/hpl';

export type QuoteAction =
  | 'send'
  | 'approve'
  | 'reject'
  | 'client-accept'
  | 'convert';

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  draft: 'Черновик',
  sent: 'Отправлено',
  approved: 'Согласовано',
  rejected: 'Отклонено',
  converted: 'Конвертировано',
};

export const quoteStatusClassNames: Record<QuoteStatus, string> = {
  draft: 'border-slate-200 bg-slate-50 text-slate-700',
  sent: 'border-blue-200 bg-blue-50 text-blue-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  converted: 'border-violet-200 bg-violet-50 text-violet-700',
};

export function compactQuoteId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function normalizeRejectionReason(value: string): string | null {
  const reason = value.trim();
  return reason || null;
}

export function getQuoteActions({
  quote,
  currentUserId,
  permissions,
  conversionAllowed = true,
}: {
  quote: Quote;
  currentUserId?: string | null;
  permissions: readonly string[];
  conversionAllowed?: boolean;
}): QuoteAction[] {
  const hasPermission = (permission: string): boolean =>
    permissions.includes(permission);
  const isOwner = Boolean(currentUserId && quote.managerId === currentUserId);
  const canWrite =
    hasPermission('quotes:update') &&
    (isOwner || hasPermission('quotes:read_all'));
  const canRecordClientAcceptance =
    !quote.clientAcceptedAt &&
    isOwner &&
    hasPermission('quotes:client_accept') &&
    (quote.status === 'approved' || quote.status === 'converted');

  if (quote.status === 'draft') {
    return canWrite ? ['send'] : [];
  }

  if (quote.status === 'sent') {
    const actions: QuoteAction[] = [];
    if (canWrite && hasPermission('quotes:approve')) {
      actions.push('approve');
    }
    if (canWrite) {
      actions.push('reject');
    }
    return actions;
  }

  if (quote.status === 'approved') {
    const actions: QuoteAction[] = [];
    if (canRecordClientAcceptance) {
      actions.push('client-accept');
    }
    if (canWrite && conversionAllowed) {
      actions.push('convert');
    }
    return actions;
  }

  if (quote.status === 'converted' && canRecordClientAcceptance) {
    return ['client-accept'];
  }

  return [];
}

export type QuoteItemDetail = {
  label: string;
  value: string | number;
  kind: 'text' | 'number' | 'area' | 'percent' | 'money';
};

export function getQuoteItemDetails(item: QuoteItem): QuoteItemDetail[] {
  const details: Array<QuoteItemDetail | null> = [
    item.panelSizeName
      ? { label: 'Размер', value: item.panelSizeName, kind: 'text' }
      : null,
    item.thicknessMm !== undefined
      ? { label: 'Толщина', value: `${item.thicknessMm} мм`, kind: 'text' }
      : null,
    item.qualityClassName
      ? { label: 'Класс', value: item.qualityClassName, kind: 'text' }
      : null,
    item.supplierName
      ? { label: 'Поставщик', value: item.supplierName, kind: 'text' }
      : null,
    item.colorCode || item.colorName
      ? {
          label: 'Цвет',
          value: [item.colorCode, item.colorName].filter(Boolean).join(' · '),
          kind: 'text',
        }
      : null,
    item.requiredAreaM2 !== undefined
      ? { label: 'Требуется', value: item.requiredAreaM2, kind: 'area' }
      : null,
    item.sheetsCount !== undefined
      ? { label: 'Листы', value: item.sheetsCount, kind: 'number' }
      : null,
    item.wastePercent !== undefined
      ? { label: 'Отходы', value: item.wastePercent, kind: 'percent' }
      : null,
    item.supplierPricePerM2 !== undefined
      ? {
          label: 'Цена закупки за м²',
          value: item.supplierPricePerM2,
          kind: 'money',
        }
      : null,
    item.pricePerM2 !== undefined
      ? { label: 'Цена клиенту за м²', value: item.pricePerM2, kind: 'money' }
      : null,
    item.pricePerSheet !== undefined
      ? { label: 'Цена за лист', value: item.pricePerSheet, kind: 'money' }
      : null,
    item.totalPrice !== undefined
      ? { label: 'Сумма позиции', value: item.totalPrice, kind: 'money' }
      : null,
  ];

  return details.filter((detail): detail is QuoteItemDetail => detail !== null);
}
