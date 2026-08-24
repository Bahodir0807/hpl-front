"use client";

import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { useAuth } from "../../context/auth-context";
import {
  Deal,
  DealItem,
  DealOffer,
  isHplCalculatorDeal,
  useAddDealOffer,
  useDeal,
  useLoseDeal,
} from "../../hooks/use-deals";
import { InstallationPanel } from "../installations/installation-panel";
import { CalculationRequestPanel } from "../calculations/calculation-request-panel";
import { SupplierOrderPanel } from "./supplier-order-panel";
import { LoseOpportunityModal } from "../opportunities/lose-opportunity-modal";
import { TaskStatus, useTasks } from "../../hooks/use-tasks";
import { formatDateTime } from "../../lib/format";
import { formatMoney } from "../../lib/currency";
import { isCommerciallyWon, isOperationallyCompleted } from "../../lib/deal-completion";
import { getErrorMessage } from "../../lib/errors";
import { formatThicknessMm, panelSizeLabel, panelTypeLabel } from "../../lib/hpl-domain";
import { FileUpload } from "../ui/file-upload";
import {
  dealStageLabels,
  enumLabel,
  formatSupplierName,
  taskStatusLabels,
  taskTypeLabels,
} from "../../lib/labels";
import { lossReasonLabel } from "../../lib/loss-reasons";

type DealDetailsModalProps = {
  dealId: string | null;
  supplierOrderId?: string | null;
  installation?: boolean;
  onClose: () => void;
};

type TabId =
  | "items"
  | "calculations"
  | "supplier"
  | "installation"
  | "offers"
  | "history"
  | "tasks";

const tabs: { id: TabId; label: string }[] = [
  { id: "items", label: "Позиции HPL" },
  { id: "calculations", label: "Расчёты" },
  { id: "supplier", label: "Заказы поставщику" },
  { id: "installation", label: "Монтаж" },
  { id: "offers", label: "Документы КП" },
  { id: "history", label: "История этапов" },
  { id: "tasks", label: "Открытые задачи" },
];

const openTaskStatuses: TaskStatus[] = ["PENDING", "IN_PROGRESS"];

function formatDealItemSize(item: DealItem): string {
  return panelSizeLabel(item.panelSize);
}

function OfferRow({ offer }: { offer: DealOffer }) {
  return (
    <tr>
      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
        v{offer.version}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-slate-700">
        {offer.number}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-slate-700">
        {formatMoney(offer.amount)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-slate-700">
        {formatDateTime(offer.validUntil)}
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <span
          className={`rounded border px-2 py-0.5 text-xs font-semibold ${
            offer.isApproved
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {offer.isApproved ? "Согласовано" : "Черновик"}
        </span>
      </td>
    </tr>
  );
}

export function DealDetailsModal({
  dealId,
  supplierOrderId = null,
  installation = false,
  onClose,
}: DealDetailsModalProps) {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>(
    installation ? "installation" : supplierOrderId ? "supplier" : "items",
  );
  const [validUntil, setValidUntil] = useState("");
  const [offerFileId, setOfferFileId] = useState<string | null>(null);
  const [isLoseOpen, setIsLoseOpen] = useState(false);
  const dealQuery = useDeal(dealId);
  const addOffer = useAddDealOffer();
  const loseDeal = useLoseDeal();
  const tasksQuery = useTasks({
    relatedType: "Deal",
    relatedId: dealId ?? undefined,
  });
  const canSeePurchasePrice = hasPermission("products:read_purchase_price");
  const deal: Deal | undefined = dealQuery.data;
  const openTasks = useMemo(
    () =>
      (tasksQuery.data?.items ?? []).filter((task) =>
        openTaskStatuses.includes(task.status),
      ),
    [tasksQuery.data?.items],
  );

  if (!dealId) {
    return null;
  }

  const createOffer = async (): Promise<void> => {
    if (!deal) {
      return;
    }

    await addOffer.mutateAsync({
      dealId: deal.id,
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      pdfFileId: offerFileId ?? undefined,
    });
    setValidUntil("");
    setOfferFileId(null);
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-950">
              {deal?.title ?? "Сделка"}
            </h2>
            <div className="mt-1 truncate text-sm text-slate-600">
              {deal?.client?.name ?? deal?.clientId ?? "-"} ·{" "}
              {deal ? enumLabel(dealStageLabels, deal.stage) : "—"}
            </div>
            {deal ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {isCommerciallyWon(deal) ? (
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                    Коммерчески выиграна
                  </span>
                ) : null}
                {isOperationallyCompleted(deal) ? (
                  <span className="rounded border border-slate-900 bg-slate-900 px-2 py-1 font-medium text-white">
                    Операционно завершена {formatDateTime(deal.completedAt)}
                  </span>
                ) : isCommerciallyWon(deal) ? (
                  <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700">
                    В исполнении
                  </span>
                ) : null}
                {deal.stage === "LOST" ? (
                  <span className="rounded border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-700">
                    {lossReasonLabel(deal.lostReasonCode)}
                  </span>
                ) : null}
              </div>
            ) : null}
            {deal?.lostComment ? (
              <div className="mt-2 text-xs text-slate-600">
                {deal.lostComment}
              </div>
            ) : null}
            {canSeePurchasePrice ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
                  Сумма: {formatMoney(deal?.totalAmount)}
                </span>
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
                  Маржа: {formatMoney(deal?.margin)}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-start gap-2">
            {deal &&
            deal.stage !== "LOST" &&
            hasPermission("deals:update") ? (
              <button
                type="button"
                onClick={() => setIsLoseOpen(true)}
                className="rounded border border-red-200 bg-white px-2 py-1 text-sm text-red-700 hover:bg-red-50"
              >
                Проиграна
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              Закрыть
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border-b border-slate-200 px-5">
          <div className="flex w-max min-w-full gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-slate-900 text-slate-950"
                    : "border-transparent text-slate-600 hover:text-slate-950"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto overflow-x-hidden p-5">
          {dealQuery.isLoading ? (
            <div className="text-sm text-slate-600">Загрузка сделки...</div>
          ) : null}

          {dealQuery.isError ? (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {isAxiosError(dealQuery.error) &&
              dealQuery.error.response?.status === 403
                ? "Недостаточно прав для просмотра сделки."
                : isAxiosError(dealQuery.error) &&
                    dealQuery.error.response?.status === 404
                  ? "Сделка не найдена."
                  : "Не удалось загрузить сделку."}
            </div>
          ) : null}

          {deal ? (
            <>
              {activeTab === "items" ? (
                <div className="overflow-x-auto rounded border border-slate-200">
                  <table className="min-w-[760px] divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          Тип панели
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          Поставщик
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-700">
                          Размер
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-700">
                          Толщина
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-700">
                          Листы
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-700">
                          Цена
                        </th>
                        {canSeePurchasePrice && !isHplCalculatorDeal(deal) ? (
                          <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-700">
                            Закупочная цена
                          </th>
                        ) : null}
                        <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-700">
                          Итого
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(deal.items ?? []).map((item) => (
                        <tr key={item.id}>
                          <td className="min-w-40 px-3 py-2">
                            <div className="font-medium text-slate-950">
                              {panelTypeLabel(item.panelType) !== '—'
                                ? panelTypeLabel(item.panelType)
                                : (item.product?.name ?? '—')}
                            </div>
                            {item.product?.sku && !isHplCalculatorDeal(deal) ? (
                              <div className="text-xs text-slate-600">
                                {item.product.sku}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatSupplierName(
                              item.supplier?.code ?? deal.supplier?.code,
                              item.supplier?.name ?? deal.supplier?.name,
                              "—",
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                            {formatDealItemSize(item)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                            {formatThicknessMm(item.thickness)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                            {item.quantitySheets}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                            {formatMoney(item.unitPrice)}
                          </td>
                          {canSeePurchasePrice && !isHplCalculatorDeal(deal) ? (
                            <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                              {formatMoney(item.purchasePriceSnapshot)}
                            </td>
                          ) : null}
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                            {formatMoney(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(deal.items ?? []).length === 0 ? (
                    <div className="p-4 text-sm text-slate-600">
                      Позиции HPL еще не добавлены.
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeTab === "supplier" ? (
                <SupplierOrderPanel
                  dealId={deal.id}
                  deal={deal}
                  highlightedSupplierOrderId={supplierOrderId}
                />
              ) : null}

              {activeTab === "calculations" ? (
                <CalculationRequestPanel
                  dealId={deal.id}
                  clientId={deal.clientId}
                />
              ) : null}

              {activeTab === "installation" ? (
                <InstallationPanel
                  dealId={deal.id}
                  deal={deal}
                  installation={deal.installation}
                  dealReadable
                  highlighted={installation}
                />
              ) : null}

              {activeTab === "offers" ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">
                      Версии документов после создания сделки
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Коммерческое предложение до сделки хранится в карточке лида.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(event) => setValidUntil(event.target.value)}
                      className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void createOffer();
                      }}
                      disabled={addOffer.isPending}
                      className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
                    >
                      Добавить версию документа
                    </button>
                    <FileUpload
                      relatedType="DEAL"
                      relatedId={deal.id}
                      onSuccess={setOfferFileId}
                    />
                    {offerFileId ? (
                      <span className="flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        PDF прикреплён к новой версии документа
                        <button
                          type="button"
                          onClick={() => setOfferFileId(null)}
                          className="ml-1 text-emerald-800 hover:text-emerald-950"
                          title="Открепить файл"
                        >
                          ×
                        </button>
                      </span>
                    ) : null}
                  </div>

                  <div className="overflow-x-auto rounded border border-slate-200">
                    <table className="min-w-[720px] divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Версия
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Номер
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Сумма
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Действует до
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Статус
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(deal.offers ?? []).map((offer) => (
                          <OfferRow key={offer.id} offer={offer} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {activeTab === "history" ? (
                <div className="space-y-2">
                  {(deal.stageHistory ?? []).map((history) => (
                    <div
                      key={history.id}
                      className="rounded border border-slate-200 bg-white p-3 text-sm"
                    >
                      <div className="font-medium text-slate-950">
                        {enumLabel(dealStageLabels, history.oldStage)} →{" "}
                        {enumLabel(dealStageLabels, history.newStage)}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {formatDateTime(history.createdAt)}
                        {history.isException
                          ? ` · исключение согласовано: ${
                              history.approvedBy?.email ??
                              history.approvedById ??
                              "-"
                            }`
                          : ""}
                      </div>
                      {history.reason ? (
                        <div className="mt-2 text-slate-700">
                          {history.reason}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {(deal.stageHistory ?? []).length === 0 ? (
                    <div className="text-sm text-slate-600">
                      История смены этапов пуста.
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeTab === "tasks" ? (
                <div className="space-y-2">
                  {openTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded border border-slate-200 bg-white p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 truncate font-medium text-slate-950">
                          {task.title}
                        </div>
                        <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {enumLabel(taskStatusLabels, task.status)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {enumLabel(taskTypeLabels, task.type)} · срок{" "}
                        {formatDateTime(task.dueDate)}
                      </div>
                    </div>
                  ))}
                  {tasksQuery.isLoading ? (
                    <div className="text-sm text-slate-600">
                      Загрузка задач...
                    </div>
                  ) : null}
                  {!tasksQuery.isLoading && openTasks.length === 0 ? (
                    <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      Открытых задач по сделке нет.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
    <LoseOpportunityModal
      isOpen={isLoseOpen}
      title={deal?.title ?? ""}
      entityLabel="сделку"
      pending={loseDeal.isPending}
      error={loseDeal.isError ? getErrorMessage(loseDeal.error) : null}
      onClose={() => setIsLoseOpen(false)}
      onSubmit={async (payload) => {
        if (!deal) {
          return;
        }
        await loseDeal.mutateAsync({
          id: deal.id,
          reason: payload.reason,
          comment: payload.comment,
        });
        setIsLoseOpen(false);
      }}
    />
    </>
  );
}
