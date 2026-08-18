"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/auth-context";
import {
  FunnelStageMetric,
  KpiManagerMetric,
  OverdueManagerMetric,
  ReportsFilter,
  useReportsFunnel,
  useReportsKpi,
  useReportsOverdues,
} from "../../../hooks/use-reports";
import { formatNumber } from "../../../lib/format";
import { dealStageLabels, enumLabel } from "../../../lib/labels";

type TabId = "funnel" | "overdues" | "kpi";

const tabs: { id: TabId; label: string }[] = [
  { id: "funnel", label: "Воронка" },
  { id: "overdues", label: "Просрочки" },
  { id: "kpi", label: "KPI менеджеров" },
];

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

function ReportLoading() {
  return (
    <div className="flex items-center justify-center py-10">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
        aria-label="Загрузка"
      />
    </div>
  );
}

function ReportError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-red-700">Ошибка загрузки данных</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
      >
        Повторить
      </button>
    </div>
  );
}

function ReportEmpty() {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
      Данных для отчета нет.
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
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
  const canAccess =
    isInitialized && Boolean(user?.permissions.includes("reports:read"));
  const funnelQuery = useReportsFunnel(filters, canAccess);
  const overduesQuery = useReportsOverdues(filters, canAccess);
  const kpiQuery = useReportsKpi(filters, canAccess);
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
          enumLabel(dealStageLabels, stage.stage),
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

  useEffect(() => {
    if (isInitialized && !canAccess) {
      router.replace("/");
    }
  }, [canAccess, isInitialized, router]);

  if (!isInitialized) {
    return null;
  }

  if (!canAccess) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Нет доступа к отчётам и KPI.
      </div>
    );
  }

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
            funnelQuery.isLoading ? (
              <ReportLoading />
            ) : funnelQuery.isError ? (
              <ReportError
                onRetry={() => {
                  void funnelQuery.refetch();
                }}
              />
            ) : funnelStages.length === 0 ? (
              <ReportEmpty />
            ) : (
            <div className="space-y-3">
              {funnelStages.map((stage) => (
                <div key={stage.stage}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-900">
                      {enumLabel(dealStageLabels, stage.stage)}
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
            )
          ) : null}

          {activeTab === "overdues" ? (
            overduesQuery.isLoading ? (
              <ReportLoading />
            ) : overduesQuery.isError ? (
              <ReportError
                onRetry={() => {
                  void overduesQuery.refetch();
                }}
              />
            ) : overdueManagers.length === 0 ? (
              <ReportEmpty />
            ) : (
              <div className="overflow-x-auto rounded border border-slate-200">
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
            kpiQuery.isLoading ? (
              <ReportLoading />
            ) : kpiQuery.isError ? (
              <ReportError
                onRetry={() => {
                  void kpiQuery.refetch();
                }}
              />
            ) : kpiManagers.length === 0 ? (
              <ReportEmpty />
            ) : (
              <div className="overflow-x-auto rounded border border-slate-200">
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
