"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Pagination } from "../../../components/ui/pagination";
import { SearchCombobox } from "../../../components/ui/search-combobox";
import { useAuth } from "../../../context/auth-context";
import {
  OrderStatus,
  PaymentStatus,
  useCreateOrderFromDeal,
  useOrders,
} from "../../../hooks/use-orders";
import { useDeals } from "../../../hooks/use-deals";
import { prefersAccountantWorkspace } from "../../../lib/auth-routing";
import { getErrorMessage } from "../../../lib/errors";
import { formatDate } from "../../../lib/format";
import { formatMoney } from "../../../lib/currency";
import { enumLabel } from "../../../lib/labels";
import { useI18n } from "@/i18n/provider";
import { useLabelMaps } from "@/i18n/use-label-maps";

const OrderDetailsModal = dynamic(
  () =>
    import("@/components/orders/order-details-modal").then(
      (m) => m.OrderDetailsModal,
    ),
  { ssr: false },
);

type OrderStatusFilter = "ALL" | OrderStatus;
type PaymentStatusFilter = "ALL" | PaymentStatus;

const orderStatuses: OrderStatusFilter[] = [
  "ALL",
  "DRAFT",
  "CONFIRMED",
  "WAITING_PAYMENT",
  "PARTIALLY_PAID",
  "PAID",
  "WAITING_STOCK",
  "PENDING_SUPPLIER",
  "READY_FOR_SHIPMENT",
  "PARTIALLY_SHIPPED",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
];

const paymentStatuses: PaymentStatusFilter[] = [
  "ALL",
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
];

export default function OrdersPage() {
  const { t, locale, messages } = useI18n();
  const labels = useLabelMaps();
  const { user } = useAuth();
  const isAccountantWorkspace = prefersAccountantWorkspace(user?.permissions);
  const [status, setStatus] = useState<OrderStatusFilter>("ALL");
  const [paymentStatusOverride, setPaymentStatusOverride] =
    useState<PaymentStatusFilter | null>(null);
  const paymentStatus: PaymentStatusFilter =
    paymentStatusOverride ?? (isAccountantWorkspace ? "UNPAID" : "ALL");
  const [dealId, setDealId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const filters = useMemo(
    () => ({
      status: status === "ALL" ? undefined : status,
      paymentStatus: paymentStatus === "ALL" ? undefined : paymentStatus,
      page,
      limit: 20,
    }),
    [page, paymentStatus, status],
  );
  const ordersQuery = useOrders(filters);
  const wonDealsQuery = useDeals({ stage: "WON", limit: 100 });
  const createOrder = useCreateOrderFromDeal();
  const dealOptions = useMemo(
    () =>
      (wonDealsQuery.data?.items ?? []).map((deal) => ({
        value: deal.id,
        label: deal.title,
        description: deal.client?.name ?? undefined,
      })),
    [wonDealsQuery.data?.items],
  );
  const orders = ordersQuery.data?.items ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const orderStatusFilterLabel = (value: OrderStatusFilter): string =>
    value === "ALL"
      ? t("common.allStatuses")
      : enumLabel(labels.orderStatusLabels, value);

  const paymentStatusFilterLabel = (value: PaymentStatusFilter): string =>
    value === "ALL"
      ? t("common.all")
      : enumLabel(labels.paymentStatusLabels, value);

  const submitCreateOrder = async (): Promise<void> => {
    if (!dealId.trim()) {
      return;
    }

    await createOrder.mutateAsync({
      dealId: dealId.trim(),
      deliveryAddress: deliveryAddress || undefined,
    });
    setDealId("");
    setDeliveryAddress("");
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">
            {t("orders.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isAccountantWorkspace
              ? t("orders.subtitleAccountant")
              : t("orders.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded border border-slate-200 bg-white p-3 lg:grid-cols-2">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("orders.orderStatus")}
              </span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as OrderStatusFilter);
                  setPage(1);
                }}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {orderStatuses.map((item) => (
                  <option key={item} value={item}>
                    {orderStatusFilterLabel(item)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("orders.payment")}
              </span>
              <select
                value={paymentStatus}
                onChange={(event) => {
                  setPaymentStatusOverride(
                    event.target.value as PaymentStatusFilter,
                  );
                  setPage(1);
                }}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {paymentStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item === "UNPAID"
                      ? t("orders.awaitingPaymentConfirm")
                      : paymentStatusFilterLabel(item)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!isAccountantWorkspace ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
            <SearchCombobox
              value={dealId}
              onChange={setDealId}
              options={dealOptions}
              placeholder={t("orders.selectWonDeal")}
              searchPlaceholder={t("orders.searchDeal")}
              emptyLabel={t("orders.dealsEmpty")}
              loading={wonDealsQuery.isFetching}
            />
            <input
              value={deliveryAddress}
              onChange={(event) => setDeliveryAddress(event.target.value)}
              placeholder={t("orders.deliveryAddress")}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                void submitCreateOrder();
              }}
              disabled={createOrder.isPending}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
            >
              {t("orders.createFromDeal")}
            </button>
          </div>
          ) : null}
        </div>

        {createOrder.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {getErrorMessage(
              createOrder.error,
              t("orders.createHint"),
              messages,
            )}
          </div>
        ) : null}

        {ordersQuery.isError ? (
          <div className="rounded border border-red-200 bg-red-50 py-10 text-center">
            <p className="text-sm text-red-700">{t("common.loadError")}</p>
            <button
              type="button"
              onClick={() => {
                void ordersQuery.refetch();
              }}
              className="mt-3 rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            >
              {t("common.retry")}
            </button>
          </div>
        ) : null}

        {ordersQuery.isLoading ? (
          <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
            {t("orders.loading")}
          </div>
        ) : null}

        {!ordersQuery.isLoading && !ordersQuery.isError ? (
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t("orders.columnOrder")}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t("orders.columnClientDeal")}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t("common.status")}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t("orders.payment")}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t("deals.amount")}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t("common.created")}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-3 py-3 font-medium text-slate-950">
                      {order.orderNumber}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {order.deal?.client?.name ?? t("common.dash")}
                      {order.deal?.title ? (
                        <div className="mt-0.5 text-xs text-slate-500">
                          {order.deal.title}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {enumLabel(labels.orderStatusLabels, order.status)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {enumLabel(labels.paymentStatusLabels, order.paymentStatus)}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-950">
                      {formatMoney(order.totalAmount)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatDate(order.createdAt, locale)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {t("common.open")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-600">
                {t("orders.empty")}
              </div>
            ) : null}
          </div>
        ) : null}

        {!ordersQuery.isLoading && !ordersQuery.isError ? (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <OrderDetailsModal
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </>
  );
}
