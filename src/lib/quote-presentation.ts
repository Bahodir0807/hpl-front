import type { Quote, QuoteItem, QuoteStatus } from '@/types/hpl';
import {
  formatThicknessMm,
  hplApplicationLabel,
  panelTypeLabel,
} from '@/lib/hpl-domain';
import { ru } from '@/i18n/ru';
import { getActiveMessages } from '@/i18n/active-messages';
import type { Messages } from '@/i18n/types';
import { formatSupplierName } from '@/lib/labels';
import { qualityLineLabel } from '@/lib/quality-line-presentation';

export type QuoteAction =
  | 'send'
  | 'approve'
  | 'reject'
  | 'client-accept'
  | 'convert';

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  ...ru.statuses.quote,
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

export function quoteItemTitle(
  item: QuoteItem,
  messages: Messages = getActiveMessages(),
): string {
  if (item.panelTypeName?.trim()) {
    return item.panelTypeName.trim();
  }

  if (item.application) {
    return hplApplicationLabel(item.application, messages);
  }

  const fromCode = panelTypeLabel({
    code: item.panelTypeCode,
    displayNameRu: null,
  }, messages);
  if (fromCode !== '—') {
    return fromCode;
  }

  return item.name?.trim() || messages.quotes.itemHpl;
}

export function getQuoteItemDetails(
  item: QuoteItem,
  messages: Messages = getActiveMessages(),
): QuoteItemDetail[] {
  const typeValue = quoteItemTitle(item, messages);
  const details: Array<QuoteItemDetail | null> = [
    item.application || item.panelTypeCode || item.panelTypeName
      ? { label: messages.quotes.typeHpl, value: typeValue, kind: 'text' }
      : null,
    item.panelSizeName
      ? { label: messages.quotes.size, value: item.panelSizeName, kind: 'text' }
      : null,
    item.thicknessMm !== undefined && item.thicknessMm !== null
      ? { label: messages.quotes.thickness, value: formatThicknessMm(item.thicknessMm, messages), kind: 'text' }
      : null,
    item.qualityClassName || item.qualityClassCode
      ? {
          label: messages.quotes.class,
          value: qualityLineLabel({
            code: item.qualityClassCode,
            nameRu: item.qualityClassName,
          }, messages),
          kind: 'text',
        }
      : null,
    item.supplierCode || item.supplierName
      ? {
          label: messages.quotes.supplier,
          value: formatSupplierName(item.supplierCode, item.supplierName, '—'),
          kind: 'text',
        }
      : null,
    item.colorCode || item.colorName
      ? {
          label: messages.quotes.decor,
          value: [item.colorCode, item.colorName].filter(Boolean).join(' · '),
          kind: 'text',
        }
      : null,
    item.coating?.trim()
      ? { label: messages.quotes.coating, value: item.coating.trim(), kind: 'text' }
      : null,
    item.texture?.trim()
      ? { label: messages.quotes.texture, value: item.texture.trim(), kind: 'text' }
      : null,
    item.customTypeDescription?.trim()
      ? {
          label: messages.quotes.customType,
          value: item.customTypeDescription.trim(),
          kind: 'text',
        }
      : null,
    item.customWidthMm != null &&
    item.customHeightMm != null &&
    String(item.customWidthMm) !== '' &&
    String(item.customHeightMm) !== ''
      ? {
          label: messages.quotes.customSize,
          value: messages.quotes.customSizeValue
            .replace('{width}', String(item.customWidthMm))
            .replace('{height}', String(item.customHeightMm)),
          kind: 'text',
        }
      : null,
    item.note?.trim()
      ? { label: messages.quotes.note, value: item.note.trim(), kind: 'text' }
      : null,
    item.requiredAreaM2 !== undefined
      ? { label: messages.quotes.required, value: item.requiredAreaM2, kind: 'area' }
      : null,
    item.sheetsCount !== undefined
      ? { label: messages.quotes.sheets, value: item.sheetsCount, kind: 'number' }
      : null,
    item.wastePercent !== undefined
      ? { label: messages.quotes.waste, value: item.wastePercent, kind: 'percent' }
      : null,
    item.pricePerM2 != null
      ? {
          label: item.priceApprovedAt
            ? messages.quotes.approvedPriceM2
            : messages.quotes.calculatedPriceM2,
          value: item.pricePerM2,
          kind: 'money',
        }
      : null,
    item.pricePerSheet != null
      ? { label: messages.quotes.pricePerSheet, value: item.pricePerSheet, kind: 'money' }
      : null,
    item.totalPrice != null
      ? { label: messages.quotes.itemTotal, value: item.totalPrice, kind: 'money' }
      : null,
  ];

  return details.filter((detail): detail is QuoteItemDetail => detail !== null);
}
