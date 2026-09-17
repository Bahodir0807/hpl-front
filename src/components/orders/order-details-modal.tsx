"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FileUpload } from "../ui/file-upload";
import { MoneyInput } from "../ui/money-input";
import {
  Order,
  OrderStatus,
  Payment,
  useAddPayment,
  useConfirmPayment,
  useCreateDelivery,
  useOrder,
} from "../../hooks/use-orders";
import { formatDate, formatNumber } from "../../lib/format";
import { formatMoney, MoneyCurrency } from "../../lib/currency";
import {
  enumLabel,
} from "../../lib/labels";
import { useI18n } from "@/i18n/provider";
import type { Messages } from "@/i18n/types";
import { useLabelMaps } from "@/i18n/use-label-maps";

type OrderDetailsModalProps = {
  orderId: string | null;
  onClose: () => void;
};

type TabId = "payments" | "deliveries";

function createPaymentSchema(messages: Messages) {
  return z.object({
    amount: z.coerce.number().positive(messages.validation.amountPositive),
    currency: z.enum(["USD", "UZS"]),
    comment: z.string().trim().optional(),
  });
}

type PaymentFormInput = z.input<ReturnType<typeof createPaymentSchema>>;
type PaymentFormValues = z.infer<ReturnType<typeof createPaymentSchema>>;

function isOrderLocked(status: OrderStatus): boolean {
  return status === "SHIPPED" || status === "CANCELLED";
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
  isPending,
  pendingStatus,
  onConfirm,
}: {
  payment: Payment;
  canConfirm: boolean;
  isPending: boolean;
  pendingStatus?: "CONFIRMED" | "REJECTED";
  onConfirm: (paymentId: string, status: "CONFIRMED" | "REJECTED") => void;
}) {
  const { t } = useI18n();
  const { paymentRecordStatusLabels } = useLabelMaps();
  const isConfirmingThis =
    isPending && pendingStatus === "CONFIRMED";
  const isRejectingThis = isPending && pendingStatus === "REJECTED";

  return (
    <tr>
      <td className="px-3 py-2 text-slate-700">
        {formatDate(payment.paymentDate)}
      </td>
      <td className="px-3 py-2 font-medium text-slate-950">
        {formatMoney(payment.amount)}
      </td>
      <td className="px-3 py-2 text-slate-700">
        {enumLabel(paymentRecordStatusLabels, payment.status)}
      </td>
      <td className="px-3 py-2 text-slate-700">{payment.comment ?? t("common.dash")}</td>
      <td className="px-3 py-2 text-right">
        {canConfirm && payment.status === "PENDING" ? (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => onConfirm(payment.id, "CONFIRMED")}
              className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConfirmingThis ? (
                <span className="h-3 w-3 animate-spin rounded-full border border-emerald-300 border-t-emerald-700" />
              ) : null}
              {t("common.confirm")}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => onConfirm(payment.id, "REJECTED")}
              className="inline-flex items-center gap-1 rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRejectingThis ? (
                <span className="h-3 w-3 animate-spin rounded-full border border-red-300 border-t-red-700" />
              ) : null}
              {t("quotes.reject")}
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
  const { t, messages } = useI18n();
  const { orderStatusLabels, deliveryStatusLabels } = useLabelMaps();
  const orderQuery = useOrder(orderId);
  const addPayment = useAddPayment();
  const confirmPayment = useConfirmPayment();
  const createDelivery = useCreateDelivery();
  const [activeTab, setActiveTab] = useState<TabId>("payments");
  const [paymentFileId, setPaymentFileId] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [recipient, setRecipient] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [deliveryQuantities, setDeliveryQuantities] = useState<
    Record<string, string>
  >({});
  const paymentSchema = useMemo(
    () => createPaymentSchema(messages),
    [messages],
  );
  const {
    register,
    handleSubmit,
    control,
    reset: resetPaymentForm,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormInput, unknown, PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      currency: "UZS",
      comment: "",
    },
  });
  const order = orderQuery.data;
  const isLocked = order ? isOrderLocked(order.status) : false;
  const canAddPayment = order?._permissions?.canAddPayment !== false;
  const canConfirmPayments = order?._permissions?.canConfirmPayment === true;
  const canCreateDelivery = order?._permissions?.canCreateDelivery === true;
  const remainingByItem = useMemo(
    () =>
      (order?.items ?? []).map((item) => ({
        id: item.id,
        label: item.product?.sku ?? item.productId,
        remaining: Number(item.quantity) - Number(item.deliveredQuantity),
      })),
    [order?.items],
  );

  if (!orderId) {
    return null;
  }

  const onSubmitPayment = async (values: PaymentFormValues): Promise<void> => {
    if (!order) {
      return;
    }

    await addPayment.mutateAsync({
      orderId: order.id,
      amount: values.amount,
      comment: values.comment || undefined,
      fileId: paymentFileId ?? undefined,
    });
    resetPaymentForm({
      amount: "",
      currency: values.currency,
      comment: "",
    });
    setPaymentFileId(null);
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
                {t("orders.orderLabel", { number: order?.orderNumber ?? "" })}
              </h2>
              <div className="mt-1 text-sm text-slate-600">
                {order?.deal?.client?.name ?? order?.dealId ?? t("common.dash")} ·{" "}
                {order ? enumLabel(orderStatusLabels, order.status) : t("common.dash")}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700"
            >
              {t("common.close")}
            </button>
          </div>

          {order ? (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                {t("orders.totalLabel", { amount: formatMoney(order.totalAmount) })}
              </span>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                {t("orders.paidLabel", { amount: formatMoney(order.paidAmount) })}
              </span>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                {t("orders.remainingLabel", {
                  amount: formatMoney(order.remainingAmount),
                })}
              </span>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                {t("orders.deliveredLabel", {
                  qty: formatNumber(deliveredTotal(order)),
                })}
              </span>
            </div>
          ) : null}

          {isLocked ? (
            <div className="mt-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t("orders.locked")}
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
              {t("orders.payments")}
            </button>
            {canCreateDelivery ? (
              <button
                type="button"
                onClick={() => setActiveTab("deliveries")}
                className={`border-b-2 px-3 py-2 text-sm font-medium ${
                  activeTab === "deliveries"
                    ? "border-slate-900 text-slate-950"
                    : "border-transparent text-slate-600"
                }`}
              >
                {t("orders.shipments")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          {orderQuery.isLoading ? (
            <div className="text-sm text-slate-600">{t("orders.detailsLoading")}</div>
          ) : null}

          {order ? (
            <>
              {activeTab === "payments" ? (
                <div className="space-y-4">
                  {canAddPayment ? (
                    <form
                      onSubmit={(event) => {
                        void handleSubmit(onSubmitPayment)(event);
                      }}
                      className="rounded border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="mb-2 text-sm font-semibold text-slate-950">
                        {t("orders.registerPayment")}
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(220px,1fr)_1fr_auto]">
                        <div>
                          <Controller
                            name="amount"
                            control={control}
                            render={({ field: amountField }) => (
                              <Controller
                                name="currency"
                                control={control}
                                render={({ field: currencyField }) => (
                                  <MoneyInput
                                    value={
                                      amountField.value === undefined ||
                                      amountField.value === null
                                        ? ""
                                        : String(amountField.value)
                                    }
                                    currency={
                                      currencyField.value as MoneyCurrency
                                    }
                                    onValueChange={amountField.onChange}
                                    onCurrencyChange={currencyField.onChange}
                                    placeholder={t("orders.paymentAmount")}
                                    inputClassName="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                                    selectClassName="rounded border border-slate-300 bg-white px-2 py-2 text-sm"
                                  />
                                )}
                              />
                            )}
                          />
                          {errors.amount ? (
                            <span className="mt-1 block text-sm text-red-600">
                              {errors.amount.message}
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <input
                            {...register("comment")}
                            placeholder={t("common.comment")}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={addPayment.isPending || isSubmitting}
                          className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
                        >
                          {t("common.add")}
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <FileUpload
                          relatedType="ORDER"
                          relatedId={order.id}
                          onSuccess={setPaymentFileId}
                        />
                        {paymentFileId ? (
                          <span className="flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                            {t("orders.fileAttachedToPayment")}
                            <button
                              type="button"
                              onClick={() => setPaymentFileId(null)}
                              className="ml-1 text-emerald-800 hover:text-emerald-950"
                              title={t("common.detachFile")}
                            >
                              ×
                            </button>
                          </span>
                        ) : null}
                      </div>
                    </form>
                  ) : null}

                  <div className="overflow-x-auto rounded border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            {t("common.date")}
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            {t("common.amount")}
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            {t("common.status")}
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            {t("common.comment")}
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-700">
                            {t("common.actions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(order.payments ?? []).map((payment) => (
                          <PaymentRow
                            key={payment.id}
                            payment={payment}
                            canConfirm={canConfirmPayments}
                            isPending={confirmPayment.isPending}
                            pendingStatus={
                              confirmPayment.variables?.paymentId === payment.id
                                ? confirmPayment.variables.status
                                : undefined
                            }
                            onConfirm={(paymentId, status) => {
                              if (confirmPayment.isPending) {
                                return;
                              }
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

              {activeTab === "deliveries" && canCreateDelivery ? (
                <div className="space-y-4">
                  <div className="rounded border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 text-sm font-semibold text-slate-950">
                      {t("orders.createShipment")}
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
                        placeholder={t("orders.recipient")}
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={trackingNumber}
                        onChange={(event) =>
                          setTrackingNumber(event.target.value)
                        }
                        placeholder={t("orders.waybill")}
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {remainingByItem.map((item) => (
                        <label key={item.id} className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-700">
                            {t("orders.remainingItem", {
                              label: item.label,
                              qty: formatNumber(item.remaining),
                            })}
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
                        {t("orders.createShipment")}
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
                          {enumLabel(deliveryStatusLabels, delivery.status)}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {delivery.recipient ?? t("common.dash")} ·{" "}
                          {delivery.trackingNumber ?? t("common.dash")}
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
