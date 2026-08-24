import type { Quote, QuoteItem, QuoteStatus } from '@/types/hpl';
import {
  formatThicknessMm,
  hplApplicationLabel,
  panelTypeLabel,
} from '@/lib/hpl-domain';
import { formatSupplierName } from '@/lib/labels';
import { qualityLineLabel } from '@/lib/quality-line-presentation';

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
    return canWrite && Boolean(quote.finalizedAt && quote.pdfFileId)
      ? ['send']
      : [];
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
    if (canWrite && hasPermission('quotes:approve') && conversionAllowed) {
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

export function quoteItemGroupTitle(item: QuoteItem): string | null {
  const title =
    item.calculationGroupTitle?.trim() || item.calculationTitle?.trim() || '';
  return title || null;
}

export function quoteItemTitle(item: QuoteItem): string {
  if (item.panelTypeName?.trim()) {
    return item.panelTypeName.trim();
  }

  if (item.application) {
    return hplApplicationLabel(item.application);
  }

  const fromCode = panelTypeLabel({
    code: item.panelTypeCode,
    displayNameRu: null,
  });
  if (fromCode !== '—') {
    return fromCode;
  }

  return item.name?.trim() || 'Позиция HPL';
}

export function getQuoteItemDetails(item: QuoteItem): QuoteItemDetail[] {
  const typeValue = quoteItemTitle(item);
  const details: Array<QuoteItemDetail | null> = [
    item.application || item.panelTypeCode || item.panelTypeName
      ? { label: 'Тип HPL', value: typeValue, kind: 'text' }
      : null,
    item.panelSizeName
      ? { label: 'Размер', value: item.panelSizeName, kind: 'text' }
      : null,
    item.thicknessMm !== undefined && item.thicknessMm !== null
      ? { label: 'Толщина', value: formatThicknessMm(item.thicknessMm), kind: 'text' }
      : null,
    item.qualityClassName || item.qualityClassCode
      ? {
          label: 'Класс',
          value: qualityLineLabel({
            code: item.qualityClassCode,
            nameRu: item.qualityClassName,
          }),
          kind: 'text',
        }
      : null,
    item.supplierCode || item.supplierName
      ? {
          label: 'Поставщик',
          value: formatSupplierName(item.supplierCode, item.supplierName, '—'),
          kind: 'text',
        }
      : null,
    item.colorCode || item.colorName
      ? {
          label: 'Декор',
          value: [item.colorCode, item.colorName].filter(Boolean).join(' · '),
          kind: 'text',
        }
      : null,
    item.coating?.trim()
      ? { label: 'Покрытие', value: item.coating.trim(), kind: 'text' }
      : null,
    item.texture?.trim()
      ? { label: 'Текстура', value: item.texture.trim(), kind: 'text' }
      : null,
    item.customTypeDescription?.trim()
      ? {
          label: 'Нестандартный тип',
          value: item.customTypeDescription.trim(),
          kind: 'text',
        }
      : null,
    item.customWidthMm != null &&
    item.customHeightMm != null &&
    String(item.customWidthMm) !== '' &&
    String(item.customHeightMm) !== ''
      ? {
          label: 'Нестандартный размер',
          value: `${item.customWidthMm} × ${item.customHeightMm} мм`,
          kind: 'text',
        }
      : null,
    item.note?.trim()
      ? { label: 'Примечание', value: item.note.trim(), kind: 'text' }
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
    item.pricePerM2 != null
      ? {
          label: item.priceApprovedAt
            ? 'Утверждённая цена за м²'
            : 'Расчётная / справочная цена за м²',
          value: item.pricePerM2,
          kind: 'money',
        }
      : null,
    item.pricePerSheet != null
      ? { label: 'Цена за лист', value: item.pricePerSheet, kind: 'money' }
      : null,
    item.totalPrice != null
      ? { label: 'Сумма позиции', value: item.totalPrice, kind: 'money' }
      : null,
  ];

  return details.filter((detail): detail is QuoteItemDetail => detail !== null);
}
