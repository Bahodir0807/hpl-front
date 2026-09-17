"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductSearchSelect } from "../../../components/products/product-search-select";
import { useAuth } from "../../../context/auth-context";
import {
  ExpectedReceipt,
  useCreateExpectedReceipt,
  useExpectedReceipts,
  useReceiveExpectedReceipt,
} from "../../../hooks/use-inventory";
import { useSuppliers } from "../../../hooks/use-panels";
import { formatDate } from "../../../lib/format";
import { enumLabel, formatSupplierName } from "../../../lib/labels";
import { useI18n } from "@/i18n/provider";
import { useLabelMaps } from "@/i18n/use-label-maps";
import type { TranslateFn } from "@/i18n/translate";

function itemsText(receipt: ExpectedReceipt, t: TranslateFn): string {
  return receipt.items
    .map((item) =>
      t("receipts.composition", {
        product: item.product?.name ?? item.product?.sku ?? t("receipts.product"),
        received: item.receivedQuantity,
        quantity: item.quantity,
      }),
    )
    .join(", ");
}

export default function ReceiptsPage() {
  const { t, locale } = useI18n();
  const labels = useLabelMaps();
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const canAccess =
    isInitialized && Boolean(user?.permissions.includes("inventory:read"));
  const canPlan = user?.permissions.includes("warehouse_purchases:plan") ?? false;
  const canReceive =
    user?.permissions.includes("warehouse_purchases:receive") ?? false;
  const canReadSuppliers =
    user?.permissions.includes("panel_catalog:read") ?? false;
  const receiptsQuery = useExpectedReceipts(canAccess);
  const suppliersQuery = useSuppliers(canAccess && canReadSuppliers);
  const createReceipt = useCreateExpectedReceipt();
  const receiveReceipt = useReceiveExpectedReceipt();
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [receivingReceipt, setReceivingReceipt] =
    useState<ExpectedReceipt | null>(null);
  const [receivedQuantities, setReceivedQuantities] = useState<
    Record<string, string>
  >({});
  const [rejectedQuantities, setRejectedQuantities] = useState<
    Record<string, string>
  >({});
  const [receiveComment, setReceiveComment] = useState("");
  const receipts = receiptsQuery.data?.items ?? [];

  const submitCreate = async (): Promise<void> => {
    if (!expectedDate || !productId || Number(quantity) <= 0) {
      return;
    }

    await createReceipt.mutateAsync({
      supplierId: supplierId || undefined,
      expectedDate: new Date(expectedDate).toISOString(),
      items: [{ productId, quantity: Number(quantity) }],
    });
    setSupplierId("");
    setExpectedDate("");
    setProductId("");
    setQuantity("");
  };

  const submitReceive = async (): Promise<void> => {
    if (!receivingReceipt) {
      return;
    }

    await receiveReceipt.mutateAsync({
      id: receivingReceipt.id,
      comment: receiveComment.trim() || undefined,
      items: receivingReceipt.items
        .map((item) => {
          const acceptedQuantity = Number(receivedQuantities[item.id] ?? 0);
          const rejectedQuantity = Number(rejectedQuantities[item.id] ?? 0);
          return {
            itemId: item.id,
            receivedQuantity: acceptedQuantity,
            acceptedQuantity,
            ...(rejectedQuantity > 0 ? { rejectedQuantity } : {}),
          };
        })
        .filter((item) => item.acceptedQuantity > 0),
    });
    setReceivingReceipt(null);
    setReceivedQuantities({});
    setRejectedQuantities({});
    setReceiveComment("");
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
        {t("receipts.noAccess")}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">
            {t("receipts.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("receipts.subtitle")}
          </p>
        </div>

        {canPlan ? <div className="rounded border border-slate-200 bg-white p-3">
          <div className="mb-3 text-sm font-semibold text-slate-950">
            {t("receipts.create")}
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            <select
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">{t("common.supplier")}</option>
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
            <input
              type="date"
              value={expectedDate}
              onChange={(event) => setExpectedDate(event.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="md:col-span-2">
              <ProductSearchSelect
                value={productId}
                onChange={setProductId}
                disabled={createReceipt.isPending}
              />
            </div>
            <input
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder={t("receipts.quantity")}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void submitCreate();
              }}
              disabled={createReceipt.isPending}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
            >
              {t("receipts.schedule")}
            </button>
          </div>
        </div> : null}

        {receiptsQuery.isError ? (
          <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
            {t("receipts.loadFailed")}
          </div>
        ) : null}

        {!receiptsQuery.isError ? (
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t("common.date")}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t("common.supplier")}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t("common.status")}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t("receipts.compositionTitle")}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td className="px-3 py-3 text-slate-700">
                      {formatDate(receipt.expectedDate, locale)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatSupplierName(
                        receipt.supplier?.code,
                        receipt.supplier?.name,
                        receipt.supplierId ?? t("common.dash"),
                        labels.supplierDisplayNames,
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {enumLabel(labels.expectedReceiptStatusLabels, receipt.status)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {itemsText(receipt, t)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {canReceive ? <button
                        type="button"
                        onClick={() => setReceivingReceipt(receipt)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {t("receipts.accept")}
                      </button> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {receipts.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-600">
                {t("receipts.empty")}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {receivingReceipt && canReceive ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="w-full max-w-lg rounded border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">
              {t("receipts.accept")}
            </h2>
            <div className="mt-4 space-y-3">
              {receivingReceipt.items.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="text-sm font-medium text-slate-700">
                    {item.product?.name ?? t("receipts.product")}
                    {item.product?.sku ? ` · ${item.product.sku}` : ""} ·{" "}
                    {t("receipts.expected")}{" "}
                    {item.quantity - item.receivedQuantity}
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-500">
                      {t("receipts.received")}
                    </span>
                    <input
                      type="number"
                      value={receivedQuantities[item.id] ?? ""}
                      onChange={(event) =>
                        setReceivedQuantities((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-500">
                      {t("receipts.rejected")}
                    </span>
                    <input
                      type="number"
                      value={rejectedQuantities[item.id] ?? ""}
                      onChange={(event) =>
                        setRejectedQuantities((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              ))}
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  {t("receipts.comment")}
                </span>
                <textarea
                  value={receiveComment}
                  onChange={(event) => setReceiveComment(event.target.value)}
                  rows={2}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReceivingReceipt(null);
                  setRejectedQuantities({});
                  setReceiveComment("");
                }}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  void submitReceive();
                }}
                disabled={receiveReceipt.isPending}
                className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
              >
                {t("receipts.completeReceipt")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
