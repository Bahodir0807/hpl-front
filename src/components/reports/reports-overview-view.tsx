'use client';

import { formatNumber } from '@/lib/format';
import type { ReportsOverview } from '@/hooks/use-reports';
import { lossReasonLabel } from '@/lib/loss-reasons';
import { useI18n } from '@/i18n/provider';

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">
        {value === null || value === undefined ? t('common.dash') : value}
      </div>
    </div>
  );
}

function LossReasonTable({
  title,
  reasons,
}: {
  title: string;
  reasons?: Record<string, number>;
}) {
  const { t, messages } = useI18n();
  const entries = Object.entries(reasons ?? {});
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="rounded border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
        {title}
      </div>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left font-medium text-slate-600">
              {t('reports.reason')}
            </th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">
              {t('reports.count')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {entries.map(([reason, count]) => (
            <tr key={reason}>
              <td className="px-3 py-2">{lossReasonLabel(reason, messages)}</td>
              <td className="px-3 py-2">{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsOverviewView({ data }: { data: ReportsOverview }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label={t('reports.leads')} value={data.leads?.total} />
        <KpiCard label={t('reports.qualified')} value={data.leads?.qualified} />
        <KpiCard label={t('reports.converted')} value={data.leads?.converted} />
        <KpiCard label={t('reports.lostLeads')} value={data.leads?.lost} />
        <KpiCard label={t('reports.quotesCreated')} value={data.quotes?.created} />
        <KpiCard label={t('reports.quotesApproved')} value={data.quotes?.approved} />
        <KpiCard
          label={t('reports.clientConsent')}
          value={data.quotes?.clientAccepted}
        />
        <KpiCard label={t('reports.activeDeals')} value={data.deals?.active} />
        <KpiCard label={t('reports.commerciallyWon')} value={data.deals?.won} />
        <KpiCard
          label={t('reports.operationallyCompleted')}
          value={data.deals?.operationallyCompleted}
        />
        <KpiCard label={t('reports.lostDeals')} value={data.deals?.lost} />
        <KpiCard
          label={t('reports.activeSupplierOrders')}
          value={data.supplierOrders?.active}
        />
        <KpiCard
          label={t('reports.overdueReady')}
          value={data.supplierOrders?.overdueReadiness}
        />
        <KpiCard label={t('reports.installationScheduled')} value={data.installation?.scheduled} />
        <KpiCard
          label={t('reports.waitingDoubleConfirm')}
          value={data.installation?.pendingDualConfirmation}
        />
        <KpiCard label={t('reports.installationCompleted')} value={data.installation?.completed} />
        <KpiCard label={t('reports.warehouseOnHand')} value={data.warehouse?.onHand} />
        <KpiCard label={t('reports.warehouseAvailable')} value={data.warehouse?.available} />
        <KpiCard
          label={t('reports.expectedReceipts')}
          value={data.warehouse?.pendingPurchases}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          label={t('reports.quoteToConsentHours')}
          value={
            data.averageDurationsHours?.quoteCreatedToClientAccepted == null
              ? t('common.dash')
              : formatNumber(
                  data.averageDurationsHours.quoteCreatedToClientAccepted,
                )
          }
        />
        <KpiCard
          label={t('reports.orderToReadyHours')}
          value={
            data.averageDurationsHours?.supplierOrderedToReady == null
              ? t('common.dash')
              : formatNumber(data.averageDurationsHours.supplierOrderedToReady)
          }
        />
        <KpiCard
          label={t('reports.winToCompleteHours')}
          value={
            data.averageDurationsHours?.dealWonToOperationalCompletion == null
              ? t('common.dash')
              : formatNumber(
                  data.averageDurationsHours.dealWonToOperationalCompletion,
                )
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <LossReasonTable
          title={t('reports.lostLeadReasons')}
          reasons={data.leads?.lossReasons}
        />
        <LossReasonTable
          title={t('reports.lostDealReasons')}
          reasons={data.deals?.lossReasons}
        />
      </div>
    </div>
  );
}
