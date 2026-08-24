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
import {
  enumLabel,
  expectedReceiptStatusLabels,
  formatSupplierName,
} from "../../../lib/labels";

function itemsText(receipt: ExpectedReceipt): string {
  return receipt.items
    .map(
      (item) =>
        `${item.product?.name ?? item.product?.sku ?? "Товар"}: ${item.receivedQuantity}/${item.quantity}`,
    )
    .join(", ");
}

export default function ReceiptsPage() {
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
        Нет доступа к ожидаемым приходам.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">
            Ожидаемые приходы
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Планирование поставок и фактическая приемка товара на склад.
          </p>
        </div>

        {canPlan ? <div className="rounded border border-slate-200 bg-white p-3">
          <div className="mb-3 text-sm font-semibold text-slate-950">
            Создать ожидаемый приход
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            <select
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Поставщик</option>
              {(suppliersQuery.data ?? []).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {formatSupplierName(supplier.code, supplier.name)}
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
              placeholder="Кол-во"
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
              Запланировать
            </button>
          </div>
        </div> : null}

        {receiptsQuery.isError ? (
          <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
            Не удалось загрузить реестр ожидаемых приходов.
          </div>
        ) : null}

        {!receiptsQuery.isError ? (
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Дата
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Поставщик
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Статус
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Состав
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td className="px-3 py-3 text-slate-700">
                      {formatDate(receipt.expectedDate)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatSupplierName(
                        receipt.supplier?.code,
                        receipt.supplier?.name,
                        receipt.supplierId ?? "-",
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {enumLabel(expectedReceiptStatusLabels, receipt.status)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {itemsText(receipt)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {canReceive ? <button
                        type="button"
                        onClick={() => setReceivingReceipt(receipt)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Принять на склад
                      </button> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {receipts.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-600">
                Приходы не найдены.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {receivingReceipt && canReceive ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="w-full max-w-lg rounded border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">
              Принять на склад
            </h2>
            <div className="mt-4 space-y-3">
              {receivingReceipt.items.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="text-sm font-medium text-slate-700">
                    {item.product?.name ?? "Товар"}
                    {item.product?.sku ? ` · ${item.product.sku}` : ""} · ожидается{" "}
                    {item.quantity - item.receivedQuantity}
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-500">
                      Принято
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
                      Отклонено
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
                  Комментарий
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
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  void submitReceive();
                }}
                disabled={receiveReceipt.isPending}
                className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
              >
                Провести приемку
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
