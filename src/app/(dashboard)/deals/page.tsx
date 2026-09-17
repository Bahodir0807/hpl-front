"use client";

import { isAxiosError } from "axios";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Pagination } from "../../../components/ui/pagination";
import { useAuth } from "../../../context/auth-context";
import {
  Deal,
  DealStage,
  dealStages,
  isHplCalculatorDeal,
  useChangeDealStage,
  useDeal,
  useDeals,
} from "../../../hooks/use-deals";
import { useSuppliers } from "../../../hooks/use-panels";
import {
  normalizeSupplierOrderStatus,
  useSupplierOrder,
} from "../../../hooks/use-supplier-orders";
import { useUsersList, User } from "../../../hooks/use-users";
import { dealWorkspaceHref } from "../../../lib/entity-routes";
import { isCommerciallyWon, isOperationallyCompleted } from "../../../lib/deal-completion";
import { getErrorMessage } from "../../../lib/errors";
import { formatDateTime } from "../../../lib/format";
import { formatMoney } from "../../../lib/currency";
import {
  localizeStageRequirementMessage,
  resolveEntityName,
  resolveUserName,
} from "../../../lib/display-names";
import { formatSupplierName } from "../../../lib/labels";
import { useI18n } from "@/i18n/provider";
import { useLabelMaps } from "@/i18n/use-label-maps";

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

function getStageErrorMessage(
  error: unknown,
  fallback: string,
): string | undefined {
  return localizeStageRequirementMessage(getErrorMessage(error, fallback));
}

function isBadRequest(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 400;
}

function NextActionBadge({ nextActionAt }: { nextActionAt?: string | null }) {
  const { t } = useI18n();
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
        {t("deals.noTask")}
      </span>
    );
  }

  const dueDate = new Date(nextActionAt);
  const warningWindowMs = 2 * 60 * 60 * 1000;

  if (dueDate.getTime() < now) {
    return (
      <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
        {t("deals.overdue")}
      </span>
    );
  }

  if (dueDate.getTime() <= now + warningWindowMs) {
    return (
      <span className="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
        {t("deals.dueSoon")}
      </span>
    );
  }

  return (
    <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
      {t("deals.onTime")}
    </span>
  );
}

export default function DealsPage() {
  const { t } = useI18n();

  return (
    <Suspense
      fallback={
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          {t("deals.loading")}
        </div>
      }
    >
      <DealsPageContent />
    </Suspense>
  );
}

function DealsPageContent() {
  const { t, locale } = useI18n();
  const labels = useLabelMaps();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealIdParam = searchParams.get("dealId");
  const supplierOrderIdParam = searchParams.get("supplierOrderId");
  const installationParam = searchParams.get("installation");
  const openInstallation = installationParam === "1" || installationParam === "true";
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [source, setSource] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const dealsQuery = useDeals({
    page,
    limit: 50,
    source: source || undefined,
    supplierId: supplierId || undefined,
  });
  const suppliersQuery = useSuppliers();
  const { usersById } = useUsersList(
    user?.permissions.includes("users:read") ?? false,
  );
  const changeStage = useChangeDealStage();
  const resolvedSupplierOrderQuery = useSupplierOrder(
    supplierOrderIdParam && !dealIdParam ? supplierOrderIdParam : null,
  );
  const [pendingStageChange, setPendingStageChange] =
    useState<PendingStageChange | null>(null);
  const total = dealsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);
  const stageLabels = labels.dealStageLabels;

  const selectedDealId =
    dealIdParam ?? resolvedSupplierOrderQuery.data?.dealId ?? null;
  const linkedDealQuery = useDeal(dealIdParam);

  useEffect(() => {
    if (
      !dealIdParam &&
      supplierOrderIdParam &&
      resolvedSupplierOrderQuery.data?.dealId
    ) {
      router.replace(
        dealWorkspaceHref({
          dealId: resolvedSupplierOrderQuery.data.dealId,
          supplierOrderId: supplierOrderIdParam,
        }),
        { scroll: false },
      );
    }
  }, [
    dealIdParam,
    resolvedSupplierOrderQuery.data?.dealId,
    router,
    supplierOrderIdParam,
  ]);

  const openDeal = (dealId: string, supplierOrderId?: string | null): void => {
    router.replace(
      dealWorkspaceHref({
        dealId,
        supplierOrderId: supplierOrderId ?? undefined,
      }),
      { scroll: false },
    );
  };

  const closeDeal = (): void => {
    router.replace("/deals", { scroll: false });
  };

  const dealsByStage = useMemo(() => {
    const map = new Map<DealStage, Deal[]>();

    for (const stage of dealStages) {
      map.set(stage, []);
    }

    const items = (dealsQuery.data?.items ?? []).filter((deal) => {
      if (!showCompleted && deal.completedAt) {
        return false;
      }

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
  }, [dealsQuery.data?.items, showCompleted, source, supplierId]);

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
          message: getStageErrorMessage(error, t("deals.stageRequirements")),
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
              {t("deals.title")}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              {t("deals.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-white px-3 py-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-medium">{t("deals.source")}</span>
            <select
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setPage(1);
              }}
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="">{t("common.all")}</option>
              <option value="telegram">Telegram</option>
              <option value="website">{t("deals.website")}</option>
              <option value="manual">{t("deals.manual")}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-medium">{t("deals.supplier")}</span>
            <select
              value={supplierId}
              onChange={(event) => {
                setSupplierId(event.target.value);
                setPage(1);
              }}
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="">{t("common.all")}</option>
              {(suppliersQuery.data ?? []).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {formatSupplierName(
                    supplier.code,
                    supplier.name,
                    t("suppliers.fallback"),
                    labels.supplierDisplayNames,
                  )}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(event) => setShowCompleted(event.target.checked)}
              className="h-4 w-4"
            />
            {t("deals.showCompleted")}
          </label>
        </div>

        {dealIdParam &&
        linkedDealQuery.isError &&
        isAxiosError(linkedDealQuery.error) &&
        linkedDealQuery.error.response?.status === 404 ? (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {t("deals.notFound")}
          </div>
        ) : null}

        {dealsQuery.isLoading ? (
          <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
            {t("deals.loading")}
          </div>
        ) : null}

        {dealsQuery.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {t("deals.loadFailed")}
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
                        {stageDeals.length === 1
                          ? t("deals.dealCountOne")
                          : t("deals.dealCountMany")}
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
                              onClick={() => openDeal(deal.id)}
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
                            {isCommerciallyWon(deal) ? (
                              <div className="mt-2 flex flex-wrap gap-1">
                                <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  {t("deals.commerciallyWon")}
                                </span>
                                {isOperationallyCompleted(deal) ? (
                                  <span className="rounded border border-slate-900 bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                    {t("deals.operationallyCompleted")}
                                  </span>
                                ) : (
                                  <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                    {t("deals.inFulfillment")}
                                  </span>
                                )}
                              </div>
                            ) : null}
                            {deal.completedAt ? (
                              <div className="mt-1 text-[11px] text-slate-500">
                                {t("deals.completedAt", {
                                  date: formatDateTime(deal.completedAt, locale),
                                })}
                              </div>
                            ) : null}

                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                              <div className="min-w-0">
                                <div className="text-slate-500">{t("deals.amount")}</div>
                                <div className="truncate font-semibold text-slate-900">
                                  {formatMoney(deal.totalAmount)}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <div className="text-slate-500">{t("deals.delivery")}</div>
                                <div className="truncate font-medium text-slate-900">
                                  {orderStatus
                                    ? labels.supplierOrderStatusLabels[orderStatus]
                                    : t("common.dash")}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 truncate text-xs text-slate-500">
                              {getOwnerLabel(deal, usersById)}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              {isOperationallyCompleted(deal) ? (
                                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                  {t("deals.completed")}
                                </span>
                              ) : (
                                <NextActionBadge
                                  nextActionAt={deal.nextActionAt}
                                />
                              )}
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
                                    title={t("deals.moveBack", {
                                      stage: stageLabels[previousStage],
                                    })}
                                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                                  >
                                    {t("common.previous")}
                                  </button>
                                ) : null}
                                {nextStage ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void changeDealStage(deal.id, nextStage);
                                    }}
                                    disabled={changeStage.isPending}
                                    title={t("deals.moveForward", {
                                      stage: stageLabels[nextStage],
                                    })}
                                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                                  >
                                    {t("common.next")}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        );
                      })}

                      {stageDeals.length === 0 ? (
                        <div className="rounded border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
                          {t("deals.emptyColumn")}
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
        key={`${selectedDealId ?? "none"}:${supplierOrderIdParam ?? ""}:${openInstallation ? "installation" : ""}`}
        dealId={selectedDealId}
        supplierOrderId={supplierOrderIdParam}
        installation={openInstallation}
        onClose={closeDeal}
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
