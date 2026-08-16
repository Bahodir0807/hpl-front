"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { canManagerViewExpectedReceipts } from "../../../lib/role-access";

function itemsText(receipt: ExpectedReceipt): string {
  return receipt.items
    .map(
      (item) =>
        `${item.product?.sku ?? item.productId}: ${item.receivedQuantity}/${item.quantity}`,
    )
    .join(", ");
}

export default function ReceiptsPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const canAccess =
    isInitialized && canManagerViewExpectedReceipts(user?.roles ?? []);
  const receiptsQuery = useExpectedReceipts(canAccess);
  const suppliersQuery = useSuppliers(canAccess);
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
      items: receivingReceipt.items
        .map((item) => ({
          itemId: item.id,
          receivedQuantity: Number(receivedQuantities[item.id] ?? 0),
        }))
        .filter((item) => item.receivedQuantity > 0),
    });
    setReceivingReceipt(null);
    setReceivedQuantities({});
  };

  useEffect(() => {
    if (isInitialized && !canAccess) {
      router.replace("/leads");
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

        <div className="rounded border border-slate-200 bg-white p-3">
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
            <input
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              placeholder="UUID товара"
              className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            />
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
        </div>

        {receiptsQuery.isError ? (
          <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
            Реестр приходов недоступен: в backend сейчас нет GET
            /inventory/expected-receipts. Создание и приемка подключены к
            существующим POST endpoints.
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
                      <button
                        type="button"
                        onClick={() => setReceivingReceipt(receipt)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Принять на склад
                      </button>
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

      {receivingReceipt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="w-full max-w-lg rounded border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">
              Принять на склад
            </h2>
            <div className="mt-4 space-y-3">
              {receivingReceipt.items.map((item) => (
                <label key={item.id} className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    {item.product?.sku ?? item.productId} · ожидается{" "}
                    {item.quantity - item.receivedQuantity}
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
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceivingReceipt(null)}
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
