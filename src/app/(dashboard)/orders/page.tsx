"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Pagination } from "../../../components/ui/pagination";
import { SearchCombobox } from "../../../components/ui/search-combobox";
import {
  OrderStatus,
  PaymentStatus,
  useCreateOrderFromDeal,
  useOrders,
} from "../../../hooks/use-orders";
import { useDeals } from "../../../hooks/use-deals";
import { getErrorMessage } from "../../../lib/errors";
import { formatDate } from "../../../lib/format";
import { formatMoney } from "../../../lib/currency";
import {
  enumLabel,
  orderStatusLabels,
  paymentStatusLabels,
} from "../../../lib/labels";

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
  "WAITING_PAYMENT",
  "WAITING_STOCK",
  "READY_TO_SHIP",
  "PARTIALLY_SHIPPED",
  "SHIPPED",
  "CANCELLED",
];

const paymentStatuses: PaymentStatusFilter[] = [
  "ALL",
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
];

function orderStatusFilterLabel(value: OrderStatusFilter): string {
  return value === "ALL" ? "Все статусы" : enumLabel(orderStatusLabels, value);
}

function paymentStatusFilterLabel(value: PaymentStatusFilter): string {
  return value === "ALL" ? "Все" : enumLabel(paymentStatusLabels, value);
}

export default function OrdersPage() {
  const [status, setStatus] = useState<OrderStatusFilter>("ALL");
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatusFilter>("ALL");
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
          <h2 className="text-xl font-semibold text-slate-950">Заказы</h2>
          <p className="mt-1 text-sm text-slate-600">
            Заказы из выигранных сделок, оплаты и отгрузки.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded border border-slate-200 bg-white p-3 lg:grid-cols-2">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Статус заказа
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
                Оплата
              </span>
              <select
                value={paymentStatus}
                onChange={(event) => {
                  setPaymentStatus(event.target.value as PaymentStatusFilter);
                  setPage(1);
                }}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {paymentStatuses.map((item) => (
                  <option key={item} value={item}>
                    {paymentStatusFilterLabel(item)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
            <SearchCombobox
              value={dealId}
              onChange={setDealId}
              options={dealOptions}
              placeholder="Выберите выигранную сделку"
              searchPlaceholder="Поиск сделки"
              emptyLabel="Сделки не найдены"
              loading={wonDealsQuery.isFetching}
            />
            <input
              value={deliveryAddress}
              onChange={(event) => setDeliveryAddress(event.target.value)}
              placeholder="Адрес доставки"
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
              Создать из сделки
            </button>
          </div>
        </div>

        {createOrder.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {getErrorMessage(
              createOrder.error,
              "Заказ можно создать только из выигранной сделки с позициями.",
            )}
          </div>
        ) : null}

        {ordersQuery.isError ? (
          <div className="rounded border border-red-200 bg-red-50 py-10 text-center">
            <p className="text-sm text-red-700">Ошибка загрузки данных</p>
            <button
              type="button"
              onClick={() => {
                void ordersQuery.refetch();
              }}
              className="mt-3 rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            >
              Повторить
            </button>
          </div>
        ) : null}

        {ordersQuery.isLoading ? (
          <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Загрузка заказов...
          </div>
        ) : null}

        {!ordersQuery.isLoading && !ordersQuery.isError ? (
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Заказ
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Клиент / Сделка
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Статус
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Оплата
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Сумма
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Создан
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">
                    Действия
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
                      {order.deal?.client?.name ?? "—"}
                      {order.deal?.title ? (
                        <div className="mt-0.5 text-xs text-slate-500">
                          {order.deal.title}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {enumLabel(orderStatusLabels, order.status)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {enumLabel(paymentStatusLabels, order.paymentStatus)}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-950">
                      {formatMoney(order.totalAmount)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Открыть
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-600">
                Заказы не найдены.
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
