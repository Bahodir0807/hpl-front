"use client";

import { useMemo, useState } from "react";
import { useAuth } from "../../context/auth-context";
import {
  Order,
  Payment,
  useAddPayment,
  useConfirmPayment,
  useCreateDelivery,
  useOrder,
} from "../../hooks/use-orders";

type OrderDetailsModalProps = {
  orderId: string | null;
  onClose: () => void;
};

type TabId = "payments" | "deliveries";

function formatMoney(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function deliveredTotal(order?: Order): number {
  return (order?.items ?? []).reduce(
    (sum, item) => sum + Number(item.deliveredQuantity),
    0,
  );
}

function PaymentRow({
  payment,
  canConfirm,
  onConfirm,
}: {
  payment: Payment;
  canConfirm: boolean;
  onConfirm: (paymentId: string, status: "CONFIRMED" | "REJECTED") => void;
}) {
  return (
    <tr>
      <td className="px-3 py-2 text-slate-700">
        {formatDate(payment.paymentDate)}
      </td>
      <td className="px-3 py-2 font-medium text-slate-950">
        {formatMoney(payment.amount)}
      </td>
      <td className="px-3 py-2 text-slate-700">{payment.status}</td>
      <td className="px-3 py-2 text-slate-700">{payment.comment ?? "-"}</td>
      <td className="px-3 py-2 text-right">
        {canConfirm && payment.status === "PENDING" ? (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onConfirm(payment.id, "CONFIRMED")}
              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
            >
              Подтвердить
            </button>
            <button
              type="button"
              onClick={() => onConfirm(payment.id, "REJECTED")}
              className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
            >
              Отклонить
            </button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

export function OrderDetailsModal({
  orderId,
  onClose,
}: OrderDetailsModalProps) {
  const { hasPermission } = useAuth();
  const orderQuery = useOrder(orderId);
  const addPayment = useAddPayment();
  const confirmPayment = useConfirmPayment();
  const createDelivery = useCreateDelivery();
  const [activeTab, setActiveTab] = useState<TabId>("payments");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentComment, setPaymentComment] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [recipient, setRecipient] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [deliveryQuantities, setDeliveryQuantities] = useState<
    Record<string, string>
  >({});
  const order = orderQuery.data;
  const canConfirmPayments = hasPermission("payments:confirm");
  const orderItems = order?.items ?? [];
  const remainingByItem = useMemo(
    () =>
      orderItems.map((item) => ({
        id: item.id,
        label: item.product?.sku ?? item.productId,
        remaining: Number(item.quantity) - Number(item.deliveredQuantity),
      })),
    [orderItems],
  );

  if (!orderId) {
    return null;
  }

  const submitPayment = async (): Promise<void> => {
    if (!order || Number(paymentAmount) <= 0) {
      return;
    }

    await addPayment.mutateAsync({
      orderId: order.id,
      amount: Number(paymentAmount),
      comment: paymentComment || undefined,
    });
    setPaymentAmount("");
    setPaymentComment("");
  };

  const submitDelivery = async (): Promise<void> => {
    if (!order || !deliveryDate) {
      return;
    }

    await createDelivery.mutateAsync({
      orderId: order.id,
      deliveryDate: new Date(deliveryDate).toISOString(),
      recipient: recipient || undefined,
      trackingNumber: trackingNumber || undefined,
      items: remainingByItem
        .map((item) => ({
          orderItemId: item.id,
          quantity: Number(deliveryQuantities[item.id] ?? 0),
        }))
        .filter((item) => item.quantity > 0),
    });
    setDeliveryDate("");
    setRecipient("");
    setTrackingNumber("");
    setDeliveryQuantities({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Заказ {order?.orderNumber ?? ""}
              </h2>
              <div className="mt-1 text-sm text-slate-600">
                {order?.deal?.client?.name ?? order?.dealId ?? "-"} ·{" "}
                {order?.status ?? "-"}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700"
            >
              Закрыть
            </button>
          </div>

          {order ? (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                Итого: {formatMoney(order.totalAmount)}
              </span>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                Оплачено: {formatMoney(order.paidAmount)}
              </span>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                Осталось: {formatMoney(order.remainingAmount)}
              </span>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                Поставлено: {formatMoney(deliveredTotal(order))}
              </span>
            </div>
          ) : null}
        </div>

        <div className="border-b border-slate-200 px-5">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${
                activeTab === "payments"
                  ? "border-slate-900 text-slate-950"
                  : "border-transparent text-slate-600"
              }`}
            >
              Оплаты
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("deliveries")}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${
                activeTab === "deliveries"
                  ? "border-slate-900 text-slate-950"
                  : "border-transparent text-slate-600"
              }`}
            >
              Отгрузки
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          {orderQuery.isLoading ? (
            <div className="text-sm text-slate-600">Загрузка заказа...</div>
          ) : null}

          {order ? (
            <>
              {activeTab === "payments" ? (
                <div className="space-y-4">
                  <div className="rounded border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 text-sm font-semibold text-slate-950">
                      Зарегистрировать платеж
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr_auto]">
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(event) =>
                          setPaymentAmount(event.target.value)
                        }
                        placeholder="Сумма"
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={paymentComment}
                        onChange={(event) =>
                          setPaymentComment(event.target.value)
                        }
                        placeholder="Комментарий"
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void submitPayment();
                        }}
                        disabled={addPayment.isPending}
                        className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
                      >
                        Добавить
                      </button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Дата
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Сумма
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Статус
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Комментарий
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-700">
                            Действия
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(order.payments ?? []).map((payment) => (
                          <PaymentRow
                            key={payment.id}
                            payment={payment}
                            canConfirm={canConfirmPayments}
                            onConfirm={(paymentId, status) => {
                              void confirmPayment.mutateAsync({
                                paymentId,
                                status,
                              });
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {activeTab === "deliveries" ? (
                <div className="space-y-4">
                  <div className="rounded border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 text-sm font-semibold text-slate-950">
                      Создать отгрузку
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(event) =>
                          setDeliveryDate(event.target.value)
                        }
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={recipient}
                        onChange={(event) => setRecipient(event.target.value)}
                        placeholder="Получатель"
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={trackingNumber}
                        onChange={(event) =>
                          setTrackingNumber(event.target.value)
                        }
                        placeholder="Накладная / трек"
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {remainingByItem.map((item) => (
                        <label key={item.id} className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-700">
                            {item.label} · осталось{" "}
                            {formatMoney(item.remaining)}
                          </span>
                          <input
                            type="number"
                            value={deliveryQuantities[item.id] ?? ""}
                            onChange={(event) =>
                              setDeliveryQuantities((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          void submitDelivery();
                        }}
                        disabled={createDelivery.isPending}
                        className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
                      >
                        Создать отгрузку
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(order.deliveries ?? []).map((delivery) => (
                      <div
                        key={delivery.id}
                        className="rounded border border-slate-200 bg-white p-3 text-sm"
                      >
                        <div className="font-medium text-slate-950">
                          {formatDate(delivery.deliveryDate)} ·{" "}
                          {delivery.status}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {delivery.recipient ?? "-"} ·{" "}
                          {delivery.trackingNumber ?? "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
