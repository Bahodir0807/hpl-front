import { formatNumber } from '@/lib/format';
import type { ReportsOverview } from '@/hooks/use-reports';
import { lossReasonLabel } from '@/lib/loss-reasons';

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">
        {value === null || value === undefined ? '—' : value}
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
              Причина
            </th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">
              Количество
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {entries.map(([reason, count]) => (
            <tr key={reason}>
              <td className="px-3 py-2">{lossReasonLabel(reason)}</td>
              <td className="px-3 py-2">{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsOverviewView({ data }: { data: ReportsOverview }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Лиды" value={data.leads?.total} />
        <KpiCard label="Квалифицированы" value={data.leads?.qualified} />
        <KpiCard label="Конвертированы" value={data.leads?.converted} />
        <KpiCard label="Проигранные лиды" value={data.leads?.lost} />
        <KpiCard label="КП создано" value={data.quotes?.created} />
        <KpiCard label="КП согласовано" value={data.quotes?.approved} />
        <KpiCard
          label="Согласие клиента"
          value={data.quotes?.clientAccepted}
        />
        <KpiCard label="Активные сделки" value={data.deals?.active} />
        <KpiCard label="Коммерчески выиграны" value={data.deals?.won} />
        <KpiCard
          label="Операционно завершены"
          value={data.deals?.operationallyCompleted}
        />
        <KpiCard label="Проигранные сделки" value={data.deals?.lost} />
        <KpiCard
          label="Активные заказы поставщику"
          value={data.supplierOrders?.active}
        />
        <KpiCard
          label="Просроченная готовность"
          value={data.supplierOrders?.overdueReadiness}
        />
        <KpiCard label="Монтаж запланирован" value={data.installation?.scheduled} />
        <KpiCard
          label="Ожидает двойного подтверждения"
          value={data.installation?.pendingDualConfirmation}
        />
        <KpiCard label="Монтаж завершён" value={data.installation?.completed} />
        <KpiCard label="Остаток на складе" value={data.warehouse?.onHand} />
        <KpiCard label="Доступно" value={data.warehouse?.available} />
        <KpiCard
          label="Ожидаемые приходы"
          value={data.warehouse?.pendingPurchases}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          label="КП → согласие, ч"
          value={
            data.averageDurationsHours?.quoteCreatedToClientAccepted == null
              ? '—'
              : formatNumber(
                  data.averageDurationsHours.quoteCreatedToClientAccepted,
                )
          }
        />
        <KpiCard
          label="Заказ → готовность, ч"
          value={
            data.averageDurationsHours?.supplierOrderedToReady == null
              ? '—'
              : formatNumber(data.averageDurationsHours.supplierOrderedToReady)
          }
        />
        <KpiCard
          label="Выигрыш → завершение, ч"
          value={
            data.averageDurationsHours?.dealWonToOperationalCompletion == null
              ? '—'
              : formatNumber(
                  data.averageDurationsHours.dealWonToOperationalCompletion,
                )
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <LossReasonTable
          title="Причины проигрыша лидов"
          reasons={data.leads?.lossReasons}
        />
        <LossReasonTable
          title="Причины проигрыша сделок"
          reasons={data.deals?.lossReasons}
        />
      </div>
    </div>
  );
}
