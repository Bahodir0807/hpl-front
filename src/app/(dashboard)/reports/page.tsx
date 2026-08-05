"use client";

import { useMemo, useState } from "react";
import {
  FunnelStageMetric,
  KpiManagerMetric,
  OverdueManagerMetric,
  ReportsFilter,
  useReportsFunnel,
  useReportsKpi,
  useReportsOverdues,
} from "../../../hooks/use-reports";

type TabId = "funnel" | "overdues" | "kpi";

const tabs: { id: TabId; label: string }[] = [
  { id: "funnel", label: "Воронка" },
  { id: "overdues", label: "Просрочки" },
  { id: "kpi", label: "KPI менеджеров" },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(value);
}

function exportCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function EmptyReport({ isError }: { isError: boolean }) {
  if (!isError) {
    return (
      <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Данных для отчета нет.
      </div>
    );
  }

  return (
    <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
      Отчетный backend endpoint пока недоступен. Интерфейс готов к данным
      /reports.
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("funnel");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [managerId, setManagerId] = useState("");
  const filters = useMemo<ReportsFilter>(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      managerId: managerId.trim() || undefined,
    }),
    [dateFrom, dateTo, managerId],
  );
  const funnelQuery = useReportsFunnel(filters);
  const overduesQuery = useReportsOverdues(filters);
  const kpiQuery = useReportsKpi(filters);
  const funnelStages = funnelQuery.data?.stages ?? [];
  const overdueManagers = overduesQuery.data?.managers ?? [];
  const kpiManagers = kpiQuery.data?.managers ?? [];
  const maxStageCount = Math.max(
    ...funnelStages.map((stage) => stage.count),
    1,
  );

  const exportActiveTab = (): void => {
    if (activeTab === "funnel") {
      exportCsv("funnel.csv", [
        ["Этап", "Количество", "Сумма", "Конверсия"],
        ...funnelStages.map((stage: FunnelStageMetric) => [
          stage.stage,
          String(stage.count),
          String(stage.amount),
          String(stage.conversionPercent),
        ]),
      ]);
      return;
    }

    if (activeTab === "overdues") {
      exportCsv("overdues.csv", [
        ["Менеджер", "Просрочки", "Критические", "Средняя задержка, ч"],
        ...overdueManagers.map((manager: OverdueManagerMetric) => [
          manager.managerName,
          String(manager.overdueCount),
          String(manager.criticalOverdueCount),
          String(manager.averageDelayHours),
        ]),
      ]);
      return;
    }

    exportCsv("kpi.csv", [
      [
        "Менеджер",
        "План продаж 40%",
        "Лиды 15%",
        "Конверсия 15%",
        "Сроки 15%",
        "CRM 15%",
        "Итог",
      ],
      ...kpiManagers.map((manager: KpiManagerMetric) => [
        manager.managerName,
        String(manager.salesPlanPercent),
        String(manager.qualifiedLeadsPercent),
        String(manager.conversionPercent),
        String(manager.deadlineCompliancePercent),
        String(manager.crmDisciplinePercent),
        String(manager.totalScore),
      ]),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Отчеты и KPI</h2>
          <p className="mt-1 text-sm text-slate-600">
            Воронка продаж, просрочки и расчет KPI менеджеров.
          </p>
        </div>
        <button
          type="button"
          onClick={exportActiveTab}
          className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Экспорт в CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded border border-slate-200 bg-white p-3 md:grid-cols-3">
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={managerId}
          onChange={(event) => setManagerId(event.target.value)}
          placeholder="UUID менеджера"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-3 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-slate-900 text-slate-950"
                    : "border-transparent text-slate-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === "funnel" ? (
            <div className="space-y-3">
              {funnelStages.length === 0 ? (
                <EmptyReport isError={funnelQuery.isError} />
              ) : null}
              {funnelStages.map((stage) => (
                <div key={stage.stage}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-900">
                      {stage.stage}
                    </span>
                    <span className="text-slate-600">
                      {stage.count} · {formatNumber(stage.conversionPercent)}%
                    </span>
                  </div>
                  <div className="h-4 rounded bg-slate-100">
                    <div
                      className="h-4 rounded bg-slate-900"
                      style={{
                        width: `${Math.max(4, (stage.count / maxStageCount) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {funnelQuery.data ? (
                <div className="pt-3 text-sm font-medium text-slate-900">
                  Конверсия в выигрыш:{" "}
                  {formatNumber(funnelQuery.data.winConversionPercent)}%
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "overdues" ? (
            overdueManagers.length === 0 ? (
              <EmptyReport isError={overduesQuery.isError} />
            ) : (
              <div className="overflow-hidden rounded border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Менеджер</th>
                      <th className="px-3 py-2 text-left">Просрочки</th>
                      <th className="px-3 py-2 text-left">Критические</th>
                      <th className="px-3 py-2 text-left">Средняя задержка</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {overdueManagers.map((manager) => (
                      <tr key={manager.managerId}>
                        <td className="px-3 py-2">{manager.managerName}</td>
                        <td className="px-3 py-2">{manager.overdueCount}</td>
                        <td className="px-3 py-2">
                          {manager.criticalOverdueCount}
                        </td>
                        <td className="px-3 py-2">
                          {formatNumber(manager.averageDelayHours)} ч
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}

          {activeTab === "kpi" ? (
            kpiManagers.length === 0 ? (
              <EmptyReport isError={kpiQuery.isError} />
            ) : (
              <div className="overflow-hidden rounded border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Менеджер</th>
                      <th className="px-3 py-2 text-left">План 40%</th>
                      <th className="px-3 py-2 text-left">Лиды 15%</th>
                      <th className="px-3 py-2 text-left">Конверсия 15%</th>
                      <th className="px-3 py-2 text-left">Сроки 15%</th>
                      <th className="px-3 py-2 text-left">CRM 15%</th>
                      <th className="px-3 py-2 text-left">Итог</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {kpiManagers.map((manager) => (
                      <tr key={manager.managerId}>
                        <td className="px-3 py-2 font-medium">
                          {manager.managerName}
                        </td>
                        <td className="px-3 py-2">
                          {formatNumber(manager.salesPlanPercent)}%
                        </td>
                        <td className="px-3 py-2">
                          {formatNumber(manager.qualifiedLeadsPercent)}%
                        </td>
                        <td className="px-3 py-2">
                          {formatNumber(manager.conversionPercent)}%
                        </td>
                        <td className="px-3 py-2">
                          {formatNumber(manager.deadlineCompliancePercent)}%
                        </td>
                        <td className="px-3 py-2">
                          {formatNumber(manager.crmDisciplinePercent)}%
                        </td>
                        <td className="px-3 py-2 font-semibold">
                          {formatNumber(manager.totalScore)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
