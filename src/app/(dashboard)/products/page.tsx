"use client";

import { useMemo, useState } from "react";
import { useAuth } from "../../../context/auth-context";
import {
  Product,
  ProductPriceType,
  StockBalance,
  useProducts,
  useStockBalances,
} from "../../../hooks/use-inventory";

function formatNumber(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function getPrice(product: Product, type: ProductPriceType): string {
  const price = product.prices?.find((item) => item.type === type);

  return formatNumber(price?.amount);
}

export default function ProductsPage() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const productsQuery = useProducts({
    search: search.trim() || undefined,
    limit: 100,
  });
  const balancesQuery = useStockBalances();
  const canSeePurchasePrice = hasPermission("products:read_purchase_price");
  const balancesByProduct = useMemo(() => {
    const map = new Map<string, StockBalance>();

    for (const balance of balancesQuery.data?.items ?? []) {
      map.set(balance.productId, balance);
    }

    return map;
  }, [balancesQuery.data?.items]);
  const products = productsQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">
            Каталог HPL и остатки
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Панели HPL, цены, расчет площади листа и складские остатки.
          </p>
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-white p-3">
        <label className="block max-w-md">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Поиск
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Артикул, декор, название"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>
      </div>

      {productsQuery.isLoading || balancesQuery.isLoading ? (
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Загрузка каталога...
        </div>
      ) : null}

      {productsQuery.isError ? (
        <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Не удалось загрузить каталог.
        </div>
      ) : null}

      {!productsQuery.isLoading && !productsQuery.isError ? (
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Артикул / Декор
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Толщина
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Длина
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Ширина
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  м²/лист
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Базовая цена
                </th>
                {canSeePurchasePrice ? (
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Закупочная цена
                  </th>
                ) : null}
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Факт
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Резерв
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Доступно
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.map((product) => {
                const balance = balancesByProduct.get(product.id);

                return (
                  <tr key={product.id}>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-950">
                        {product.sku}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {product.decorCode ?? product.colorName ?? product.name}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatNumber(product.thickness)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {product.length}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {product.width}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {formatNumber(product.sheetArea)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {getPrice(product, "BASE")}
                    </td>
                    {canSeePurchasePrice ? (
                      <td className="px-3 py-3 text-slate-700">
                        {getPrice(product, "PURCHASE")}
                      </td>
                    ) : null}
                    <td className="px-3 py-3 text-slate-700">
                      {formatNumber(balance?.onHand)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatNumber(balance?.reserved)}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {formatNumber(balance?.available)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {products.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600">
              Товары не найдены.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
