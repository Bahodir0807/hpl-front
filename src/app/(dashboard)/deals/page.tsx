"use client";

import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { DealDetailsModal } from "../../../components/deals/deal-details-modal";
import { StageExceptionModal } from "../../../components/deals/stage-exception-modal";
import {
  Deal,
  DealStage,
  dealStages,
  useChangeDealStage,
  useDeals,
} from "../../../hooks/use-deals";

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

function formatMoney(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function getNextStage(stage: DealStage): DealStage | null {
  const index = dealStages.indexOf(stage);

  if (index < 0 || index >= dealStages.length - 1) {
    return null;
  }

  return dealStages[index + 1];
}

function getOwnerLabel(deal: Deal): string {
  if (deal.owner?.firstName || deal.owner?.lastName) {
    return `${deal.owner.firstName ?? ""} ${deal.owner.lastName ?? ""}`.trim();
  }

  return deal.owner?.email ?? deal.ownerId;
}

function getStageErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const responseData = error.response?.data;

    if (
      responseData &&
      typeof responseData === "object" &&
      "message" in responseData
    ) {
      const message = responseData.message;

      if (typeof message === "string") {
        return message;
      }

      if (Array.isArray(message)) {
        return message.join(", ");
      }
    }
  }

  return "Требования этапа не выполнены.";
}

function isBadRequest(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 400;
}

function NextActionBadge({ nextActionAt }: { nextActionAt?: string | null }) {
  if (!nextActionAt) {
    return (
      <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
        нет задачи
      </span>
    );
  }

  const dueDate = new Date(nextActionAt);
  const now = Date.now();
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
  const dealsQuery = useDeals({ limit: 100 });
  const changeStage = useChangeDealStage();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [pendingStageChange, setPendingStageChange] =
    useState<PendingStageChange | null>(null);

  const dealsByStage = useMemo(() => {
    const map = new Map<DealStage, Deal[]>();

    for (const stage of dealStages) {
      map.set(stage, []);
    }

    for (const deal of dealsQuery.data?.items ?? []) {
      map.get(deal.stage)?.push(deal);
    }

    return map;
  }, [dealsQuery.data?.items]);

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
              Канбан по этапам, контроль следующего действия и исключения
              руководителя.
            </p>
          </div>
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
                      <div className="mt-1 truncate text-[11px] font-medium text-slate-500">
                        {stage}
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto p-2">
                      {stageDeals.map((deal) => {
                        const nextStage = getNextStage(deal.stage);

                        return (
                          <article
                            key={deal.id}
                            className="rounded border border-slate-200 bg-white p-3 shadow-sm"
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedDealId(deal.id)}
                              className="block w-full text-left"
                            >
                              <div className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
                                {deal.title}
                              </div>
                              <div className="mt-1 truncate text-xs text-slate-600">
                                {deal.client?.name ?? deal.clientId}
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
                                <div className="text-slate-500">
                                  Ответственный
                                </div>
                                <div className="truncate font-medium text-slate-900">
                                  {getOwnerLabel(deal)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <NextActionBadge
                                nextActionAt={deal.nextActionAt}
                              />
                              {nextStage ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void changeDealStage(deal.id, nextStage);
                                  }}
                                  disabled={changeStage.isPending}
                                  className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                                >
                                  Далее
                                </button>
                              ) : null}
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
