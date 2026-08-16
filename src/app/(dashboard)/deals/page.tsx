"use client";

import { isAxiosError } from "axios";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Pagination } from "../../../components/ui/pagination";
import {
  Deal,
  DealStage,
  dealStages,
  isHplCalculatorDeal,
  useChangeDealStage,
  useDeals,
} from "../../../hooks/use-deals";
import { useSuppliers } from "../../../hooks/use-panels";
import {
  normalizeSupplierOrderStatus,
  supplierOrderStatusLabels,
} from "../../../hooks/use-supplier-orders";
import { useUsersList, User } from "../../../hooks/use-users";
import { getErrorMessage } from "../../../lib/errors";
import { formatMoney } from "../../../lib/currency";
import {
  localizeStageRequirementMessage,
  resolveEntityName,
  resolveUserName,
} from "../../../lib/display-names";
import { formatSupplierName } from "../../../lib/labels";

const DealDetailsModal = dynamic(
  () =>
    import("@/components/deals/deal-details-modal").then(
      (m) => m.DealDetailsModal,
    ),
  { ssr: false },
);

const StageExceptionModal = dynamic(
  () =>
    import("@/components/deals/stage-exception-modal").then(
      (m) => m.StageExceptionModal,
    ),
  { ssr: false },
);

type PendingStageChange = {
  dealId: string;
  newStage: DealStage;
  message?: string;
};

const stageLabels: Record<DealStage, string> = {
  QUALIFICATION: "Квалификация",
  HPL_SELECTION: "Подбор HPL",
  OFFER_PREPARATION: "Подготовка КП",
  NEGOTIATION: "Переговоры",
  AGREEMENT_PENDING: "Согласование",
  PAYMENT_PREPARATION: "Подготовка оплаты",
  SHIPPED: "Отгружено",
  WON: "Выиграна",
  LOST: "Проиграна",
};

// WON и LOST — терминальные стадии: из них нет переходов ни вперёд, ни назад.
// Побочно это устраняет ложную кнопку «Далее» WON → LOST (стадии лежат
// в одном линейном массиве).
function isTerminalStage(stage: DealStage): boolean {
  return stage === "WON" || stage === "LOST";
}

function getNextStage(stage: DealStage): DealStage | null {
  const index = dealStages.indexOf(stage);

  if (index < 0 || index >= dealStages.length - 1) {
    return null;
  }

  return dealStages[index + 1];
}

function getPreviousStage(stage: DealStage): DealStage | null {
  const index = dealStages.indexOf(stage);

  if (index <= 0) {
    return null;
  }

  return dealStages[index - 1];
}

function getOwnerLabel(deal: Deal, usersById: Map<string, User>): string {
  return resolveUserName(deal.owner, deal.ownerId, usersById);
}

function getStageErrorMessage(error: unknown): string | undefined {
  return localizeStageRequirementMessage(
    getErrorMessage(error, "Требования этапа не выполнены."),
  );
}

function isBadRequest(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 400;
}

function NextActionBadge({ nextActionAt }: { nextActionAt?: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  if (!nextActionAt) {
    return (
      <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
        нет задачи
      </span>
    );
  }

  const dueDate = new Date(nextActionAt);
  const warningWindowMs = 2 * 60 * 60 * 1000;

  if (dueDate.getTime() < now) {
    return (
      <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
        просрочена
      </span>
    );
  }

  if (dueDate.getTime() <= now + warningWindowMs) {
    return (
      <span className="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
        скоро срок
      </span>
    );
  }

  return (
    <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
      в срок
    </span>
  );
}

export default function DealsPage() {
  const [page, setPage] = useState(1);
  const [source, setSource] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const dealsQuery = useDeals({
    page,
    limit: 50,
    source: source || undefined,
    supplierId: supplierId || undefined,
  });
  const suppliersQuery = useSuppliers();
  const { usersById } = useUsersList();
  const changeStage = useChangeDealStage();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [pendingStageChange, setPendingStageChange] =
    useState<PendingStageChange | null>(null);
  const total = dealsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  const dealsByStage = useMemo(() => {
    const map = new Map<DealStage, Deal[]>();

    for (const stage of dealStages) {
      map.set(stage, []);
    }

    const items = (dealsQuery.data?.items ?? []).filter((deal) => {
      if (source && (deal.source ?? "").toLowerCase() !== source) {
        return false;
      }

      if (supplierId && deal.supplierId !== supplierId) {
        const fromItems = (deal.items ?? []).some(
          (item) => item.supplierId === supplierId,
        );
        if (!fromItems) {
          return false;
        }
      }

      return true;
    });

    for (const deal of items) {
      map.get(deal.stage)?.push(deal);
    }

    return map;
  }, [dealsQuery.data?.items, source, supplierId]);

  const changeDealStage = async (
    dealId: string,
    newStage: DealStage,
  ): Promise<void> => {
    try {
      await changeStage.mutateAsync({
        id: dealId,
        newStage,
      });
    } catch (error) {
      if (isBadRequest(error)) {
        setPendingStageChange({
          dealId,
          newStage,
          message: getStageErrorMessage(error),
        });
        return;
      }

      throw error;
    }
  };

  return (
    <>
      <div className="min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-slate-950">
              Сделки / Воронка продаж
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Канбан по этапам, статус поставки и сделки из калькулятора HPL.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-white px-3 py-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-medium">Источник</span>
            <select
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setPage(1);
              }}
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Все</option>
              <option value="telegram">Telegram</option>
              <option value="website">Сайт</option>
              <option value="manual">Вручную</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-medium">Поставщик</span>
            <select
              value={supplierId}
              onChange={(event) => {
                setSupplierId(event.target.value);
                setPage(1);
              }}
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Все</option>
              {(suppliersQuery.data ?? []).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {formatSupplierName(supplier.code, supplier.name)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {dealsQuery.isLoading ? (
          <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Загрузка сделок...
          </div>
        ) : null}

        {dealsQuery.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Не удалось загрузить сделки.
          </div>
        ) : null}

        {!dealsQuery.isLoading && !dealsQuery.isError ? (
          <div className="-mx-6 overflow-x-auto px-6 pb-3">
            <div className="flex min-h-[calc(100vh-190px)] w-max min-w-full gap-3">
              {dealStages.map((stage) => {
                const stageDeals = dealsByStage.get(stage) ?? [];

                return (
                  <section
                    key={stage}
                    className="flex w-80 shrink-0 flex-col rounded border border-slate-200 bg-slate-50"
                  >
                    <div className="border-b border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-slate-950">
                          {stageLabels[stage]}
                        </h3>
                        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {stageDeals.length}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-[11px] text-slate-500">
                        {stageDeals.length}{" "}
                        {stageDeals.length === 1 ? "сделка" : "сделок"}
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto p-2">
                      {stageDeals.map((deal) => {
                        const isTerminal = isTerminalStage(deal.stage);
                        const nextStage = isTerminal
                          ? null
                          : getNextStage(deal.stage);
                        const previousStage = isTerminal
                          ? null
                          : getPreviousStage(deal.stage);
                        const isHpl = isHplCalculatorDeal(deal);
                        const orderStatus = normalizeSupplierOrderStatus(
                          deal.supplierOrder?.status,
                        );

                        return (
                          <article
                            key={deal.id}
                            className={`rounded border bg-white p-3 shadow-sm ${
                              isHpl
                                ? "border-slate-900"
                                : "border-slate-200"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedDealId(deal.id)}
                              className="block w-full text-left"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
                                  {deal.title}
                                </div>
                                <span
                                  className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                                    isHpl
                                      ? "border-slate-900 bg-slate-900 text-white"
                                      : "border-slate-200 bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  {isHpl ? "HPL" : "SKU"}
                                </span>
                              </div>
                              <div className="mt-1 truncate text-xs text-slate-600">
                                {resolveEntityName(deal.client, deal.clientId)}
                              </div>
                            </button>

                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                              <div className="min-w-0">
                                <div className="text-slate-500">Сумма</div>
                                <div className="truncate font-semibold text-slate-900">
                                  {formatMoney(deal.totalAmount)}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <div className="text-slate-500">Поставка</div>
                                <div className="truncate font-medium text-slate-900">
                                  {orderStatus
                                    ? supplierOrderStatusLabels[orderStatus]
                                    : "—"}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 truncate text-xs text-slate-500">
                              {getOwnerLabel(deal, usersById)}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <NextActionBadge
                                nextActionAt={deal.nextActionAt}
                              />
                              <div className="flex shrink-0 items-center gap-1">
                                {previousStage ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void changeDealStage(
                                        deal.id,
                                        previousStage,
                                      );
                                    }}
                                    disabled={changeStage.isPending}
                                    title={`Вернуть на этап «${stageLabels[previousStage]}»`}
                                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                                  >
                                    ← Назад
                                  </button>
                                ) : null}
                                {nextStage ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void changeDealStage(deal.id, nextStage);
                                    }}
                                    disabled={changeStage.isPending}
                                    title={`Перевести на этап «${stageLabels[nextStage]}»`}
                                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                                  >
                                    Далее →
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        );
                      })}

                      {stageDeals.length === 0 ? (
                        <div className="rounded border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
                          Нет сделок
                        </div>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        ) : null}

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      </div>

      <DealDetailsModal
        dealId={selectedDealId}
        onClose={() => setSelectedDealId(null)}
      />
      <StageExceptionModal
        dealId={pendingStageChange?.dealId ?? null}
        newStage={pendingStageChange?.newStage ?? null}
        serverMessage={pendingStageChange?.message}
        onClose={() => setPendingStageChange(null)}
      />
    </>
  );
}
