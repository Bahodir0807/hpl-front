'use client';

import Link from 'next/link';
import {
  BadgeCheck,
  BriefcaseBusiness,
  Send,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney, normalizeCurrency } from '@/lib/currency';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import {
  compactQuoteId,
  getQuoteActions,
  getQuoteItemDetails,
  QuoteAction,
  QuoteItemDetail,
  quoteStatusClassNames,
  quoteStatusLabels,
} from '@/lib/quote-presentation';
import type { Quote } from '@/types/hpl';

type QuoteCardProps = {
  quote: Quote;
  currentUserId?: string | null;
  permissions: readonly string[];
  managerName?: string;
  isLatest?: boolean;
  conversionAllowed?: boolean;
  pendingAction?: QuoteAction | null;
  onSend: () => void;
  onApprove: () => void;
  onReject: () => void;
  onClientAccept: () => void;
  onConvert: () => void;
};

function detailValue(
  detail: QuoteItemDetail,
  currency: ReturnType<typeof normalizeCurrency>,
): string {
  if (detail.kind === 'money') {
    return formatMoney(detail.value, currency);
  }
  if (detail.kind === 'area') {
    return `${formatNumber(detail.value)} м²`;
  }
  if (detail.kind === 'percent') {
    return `${formatNumber(detail.value)} %`;
  }
  if (detail.kind === 'number') {
    return formatNumber(detail.value);
  }
  return String(detail.value);
}

function ActionButton({
  action,
  pendingAction,
  onClick,
}: {
  action: QuoteAction;
  pendingAction?: QuoteAction | null;
  onClick: () => void;
}) {
  const pending = pendingAction === action;
  const labels: Record<QuoteAction, string> = {
    send: 'Отправить клиенту',
    approve: 'Согласовать',
    reject: 'Отклонить',
    'client-accept': 'Зафиксировать согласие клиента',
    convert: 'Создать сделку',
  };
  const icons: Record<QuoteAction, typeof Send> = {
    send: Send,
    approve: BadgeCheck,
    reject: XCircle,
    'client-accept': UserCheck,
    convert: BriefcaseBusiness,
  };
  const Icon = icons[action];

  return (
    <Button
      type="button"
      size="sm"
      variant={action === 'reject' ? 'destructive' : 'outline'}
      disabled={Boolean(pendingAction)}
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
      {pending ? 'Выполнение...' : labels[action]}
    </Button>
  );
}

export function QuoteCard({
  quote,
  currentUserId,
  permissions,
  managerName,
  isLatest = false,
  conversionAllowed = true,
  pendingAction,
  onSend,
  onApprove,
  onReject,
  onClientAccept,
  onConvert,
}: QuoteCardProps) {
  const currency = normalizeCurrency(quote.displayCurrency);
  const actions = getQuoteActions({
    quote,
    currentUserId,
    permissions,
    conversionAllowed,
  });
  const actionHandlers: Record<QuoteAction, () => void> = {
    send: onSend,
    approve: onApprove,
    reject: onReject,
    'client-accept': onClientAccept,
    convert: onConvert,
  };

  return (
    <article className="rounded border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-950" title={quote.id}>
              КП · {compactQuoteId(quote.id)}
            </h4>
            <span
              className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold ${quoteStatusClassNames[quote.status]}`}
            >
              {quoteStatusLabels[quote.status]}
            </span>
            {isLatest ? (
              <span className="text-xs font-medium text-slate-500">Последнее</span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Создано {formatDateTime(quote.createdAt)}
            {managerName ? ` · Менеджер: ${managerName}` : ''}
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div className="text-xs text-slate-500">Итого</div>
          <div className="text-lg font-semibold text-slate-950">
            {formatMoney(quote.totalAmount, currency)}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4">
        <MetaField
          label="Доставка"
          value={
            quote.deliveryCost !== undefined && quote.deliveryCost !== null
              ? formatMoney(quote.deliveryCost, currency)
              : 'Не указана'
          }
        />
        <MetaField label="Действует до" value={formatDate(quote.validUntil)} />
        <MetaField
          label="Согласие клиента"
          value={
            quote.clientAcceptedAt
              ? formatDateTime(quote.clientAcceptedAt)
              : 'Не зафиксировано'
          }
        />
        <MetaField label="Позиций" value={String(quote.items.length)} />
      </dl>

      {quote.clientComment || quote.rejectionReason ? (
        <div className="space-y-3 border-b border-slate-200 p-4 text-sm">
          {quote.clientComment ? (
            <TextBlock label="Комментарий клиенту" value={quote.clientComment} />
          ) : null}
          {quote.rejectionReason ? (
            <TextBlock label="Причина отказа" value={quote.rejectionReason} tone="danger" />
          ) : null}
        </div>
      ) : null}

      <details className="border-b border-slate-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
          Состав предложения · {quote.items.length}
        </summary>
        <div className="divide-y divide-slate-200 border-t border-slate-200">
          {quote.items.map((item, index) => (
            <div key={item.id} className="p-4">
              <div className="text-sm font-semibold text-slate-950">
                {index + 1}. {item.panelTypeName ?? item.name ?? 'Позиция HPL'}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
                {getQuoteItemDetails(item).map((detail) => (
                  <div key={detail.label} className="min-w-0">
                    <dt className="text-slate-500">{detail.label}</dt>
                    <dd className="mt-0.5 break-words font-medium text-slate-800">
                      {detailValue(detail, currency)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          {quote.items.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Позиции отсутствуют.</div>
          ) : null}
        </div>
      </details>

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          {quote.dealId ? (
            <Link href="/deals" className="font-medium text-slate-700 underline underline-offset-4">
              Открыть раздел сделок · {quote.dealId.slice(0, 8).toUpperCase()}
            </Link>
          ) : (
            <span className="text-slate-500">Сделка ещё не создана</span>
          )}
        </div>
        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {actions.map((action) => (
              <ActionButton
                key={action}
                action={action}
                pendingAction={pendingAction}
                onClick={actionHandlers[action]}
              />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function TextBlock({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <div>
      <div className={tone === 'danger' ? 'font-medium text-red-700' : 'font-medium text-slate-700'}>
        {label}
      </div>
      <p className={tone === 'danger' ? 'mt-1 whitespace-pre-wrap text-red-700' : 'mt-1 whitespace-pre-wrap text-slate-700'}>
        {value}
      </p>
    </div>
  );
}
