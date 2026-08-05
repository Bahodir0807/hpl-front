"use client";

import { useMemo, useState } from "react";
import { OrderDetailsModal } from "../../../components/orders/order-details-modal";
import {
  OrderStatus,
  PaymentStatus,
  useCreateOrderFromDeal,
  useOrders,
} from "../../../hooks/use-orders";

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

function formatMoney(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function OrdersPage() {
  const [status, setStatus] = useState<OrderStatusFilter>("ALL");
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatusFilter>("ALL");
  const [dealId, setDealId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const filters = useMemo(
    () => ({
      status: status === "ALL" ? undefined : status,
      paymentStatus: paymentStatus === "ALL" ? undefined : paymentStatus,
      limit: 50,
    }),
    [paymentStatus, status],
  );
  const ordersQuery = useOrders(filters);
  const createOrder = useCreateOrderFromDeal();
  const orders = ordersQuery.data?.items ?? [];

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
                onChange={(event) =>
                  setStatus(event.target.value as OrderStatusFilter)
                }
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {orderStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
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
                onChange={(event) =>
                  setPaymentStatus(event.target.value as PaymentStatusFilter)
                }
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {paymentStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={dealId}
              onChange={(event) => setDealId(event.target.value)}
              placeholder="UUID WON-сделки"
              className="rounded border border-slate-300 px-3 py-2 text-sm"
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
            Заказ можно создать только из выигранной сделки с позициями.
          </div>
        ) : null}

        {ordersQuery.isLoading ? (
          <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Загрузка заказов...
          </div>
        ) : null}

        {!ordersQuery.isLoading ? (
          <div className="overflow-hidden rounded border border-slate-200 bg-white">
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
                      {order.deal?.client?.name ?? order.dealId}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{order.status}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {order.paymentStatus}
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
      </div>

      <OrderDetailsModal
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </>
  );
}
