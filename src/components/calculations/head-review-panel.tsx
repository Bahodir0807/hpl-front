'use client';

import { AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
import { formatAreaM2, formatThicknessMm } from '@/lib/hpl-domain';
import { formatSupplierName } from '@/lib/labels';
import type { CalculationRequest } from '@/types/hpl';

export function HeadReviewPanel({
  request,
  onConvert,
  convertPending,
  convertError,
}: {
  request: CalculationRequest;
  onConvert: () => void;
  convertPending: boolean;
  convertError?: string;
}) {
  const { t } = useI18n();

  const groups = request.calculations ?? [];
  const items = groups.flatMap((group) => group.items ?? []);
  const warnings: string[] = [];

  if (!request.notes?.trim()) {
    warnings.push(t('calculations.reviewNoWarnings'));
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t('calculations.reviewTitle')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('calculations.reviewSubtitle')}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={convertPending}
          onClick={onConvert}
        >
          <FileText className="mr-2 h-4 w-4" aria-hidden />
          {convertPending
            ? t('calculations.creatingQuote')
            : t('calculations.reviewApprove')}
        </Button>
      </div>

      {convertError ? (
        <p className="mt-3 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
          {convertError}
        </p>
      ) : null}

      {request.notes?.trim() ? (
        <div className="mt-4 rounded border border-border bg-muted/50 p-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('calculations.reviewManagerNote')}
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
            {request.notes}
          </p>
        </div>
      ) : null}

      <div className="mt-4">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('calculations.reviewItems')}
        </h4>
        <ul className="mt-2 space-y-2">
          {items.map((item, index) => (
            <li
              key={item.id ?? index}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-border px-3 py-2 text-sm"
            >
              <span className="text-foreground">
                {item.panelType?.name ?? item.panelType?.displayNameRu ?? '—'}
                {item.panelSize
                  ? ` · ${item.panelSize.widthMm}×${item.panelSize.heightMm}`
                  : ''}
                {item.thicknessMm
                  ? ` · ${formatThicknessMm(item.thicknessMm)}`
                  : ''}
              </span>
              <span className="text-muted-foreground">
                {item.requiredAreaM2
                  ? formatAreaM2(item.requiredAreaM2)
                  : '—'}
                {item.supplier
                  ? ` · ${formatSupplierName(item.supplier.code, item.supplier.name, '—')}`
                  : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {warnings.length > 0 ? (
        <div className="mt-4 flex items-start gap-2 rounded border border-warning/40 bg-warning/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" aria-hidden />
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-warning-foreground">
              {t('calculations.reviewWarnings')}
            </h4>
            <ul className="mt-1 space-y-1 text-sm text-warning-foreground">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
