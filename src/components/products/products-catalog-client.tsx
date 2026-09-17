"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HplCalculatorModal } from "@/components/products/hpl-calculator-modal";
import { Pagination } from "@/components/ui/pagination";
import { useAuth } from "@/context/auth-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  Product,
  ProductPriceType,
  StockBalance,
  useProductFacets,
  useProducts,
  useStockBalances,
} from "@/hooks/use-inventory";
import { formatNumber } from "@/lib/format";
import { formatMoney, normalizeCurrency } from "@/lib/currency";
import { useI18n } from "@/i18n/provider";

const PAGE_SIZE = 20;

type CatalogFilters = {
  search: string;
  thickness?: number;
  surface?: string;
  collectionId?: string;
  brandId?: string;
  page: number;
};

function parseCatalogFilters(searchParams: URLSearchParams): CatalogFilters {
  const thicknessRaw = searchParams.get("thickness");
  const parsedThickness = thicknessRaw ? Number(thicknessRaw) : undefined;

  return {
    search: searchParams.get("search") ?? "",
    thickness:
      parsedThickness !== undefined && !Number.isNaN(parsedThickness)
        ? parsedThickness
        : undefined,
    surface: searchParams.get("surface") ?? undefined,
    collectionId: searchParams.get("collectionId") ?? undefined,
    brandId: searchParams.get("brandId") ?? undefined,
    page: Math.max(1, Number(searchParams.get("page")) || 1),
  };
}

function buildProductsUrl(
  current: URLSearchParams,
  updates: Partial<Record<keyof CatalogFilters, string | number | null>>,
  resetPage = true,
): string {
  const params = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
      continue;
    }

    params.set(key, String(value));
  }

  if (resetPage) {
    params.set("page", "1");
  }

  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function CatalogSearchField({ search }: { search: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(search);
  const debouncedSearch = useDebouncedValue(value, 450);

  useEffect(() => {
    const nextSearch = debouncedSearch.trim();
    if (nextSearch === search.trim()) {
      return;
    }

    router.replace(
      buildProductsUrl(searchParams, {
        search: nextSearch || null,
      }),
      { scroll: false },
    );
  }, [debouncedSearch, router, search, searchParams]);

  return (
    <label className="block max-w-md">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {t("inventory.search")}
      </span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t("inventory.searchPlaceholder")}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
    </label>
  );
}

export function ProductsCatalogClient() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const facetsQuery = useProductFacets();
  const filters = useMemo(
    () => parseCatalogFilters(searchParams),
    [searchParams],
  );
  const [calculatorProduct, setCalculatorProduct] = useState<Product | null>(
    null,
  );

  const productsQuery = useProducts({
    search: filters.search.trim() || undefined,
    thickness: filters.thickness,
    surface: filters.surface,
    collectionId: filters.collectionId,
    brandId: filters.brandId,
    page: filters.page,
    limit: PAGE_SIZE,
  });
  const canReadInventory = hasPermission("inventory:read");
  const balancesQuery = useStockBalances(canReadInventory);
  const canSeePurchasePrice = hasPermission("products:read_purchase_price");

  const balancesByProduct = useMemo(() => {
    const map = new Map<string, StockBalance>();

    for (const balance of balancesQuery.data?.items ?? []) {
      map.set(balance.productId, balance);
    }

    return map;
  }, [balancesQuery.data?.items]);

  const products = productsQuery.data?.items ?? [];
  const total = productsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const facets = facetsQuery.data;

  const replaceFilters = (
    updates: Partial<Record<keyof CatalogFilters, string | number | null>>,
    resetPage = true,
  ): void => {
    router.replace(buildProductsUrl(searchParams, updates, resetPage), {
      scroll: false,
    });
  };

  const getPrice = (product: Product, type: ProductPriceType): string => {
    const price = product.prices?.find((item) => item.type === type);

    return formatMoney(price?.amount, normalizeCurrency(price?.currency));
  };

  const hasActiveFilters =
    Boolean(filters.thickness) ||
    Boolean(filters.surface) ||
    Boolean(filters.collectionId) ||
    Boolean(filters.brandId) ||
    Boolean(filters.search);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">
            {t("inventory.stockTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("inventory.stockSubtitle")}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded border border-slate-200 bg-white p-3">
        <CatalogSearchField key={filters.search} search={filters.search} />

        {facetsQuery.isLoading ? (
          <div className="text-sm text-slate-500">{t("inventory.loadingFilters")}</div>
        ) : null}

        {facets ? (
          <div className="space-y-3">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
                {t("inventory.thickness")}
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label={t("common.all")}
                  active={filters.thickness === undefined}
                  onClick={() => replaceFilters({ thickness: null })}
                />
                {facets.thicknesses.map((item) => (
                  <FilterChip
                    key={item.value}
                    label={`${t("common.mm", { value: formatNumber(item.value) })} (${item.count})`}
                    active={filters.thickness === item.value}
                    onClick={() =>
                      replaceFilters({
                        thickness:
                          filters.thickness === item.value ? null : item.value,
                      })
                    }
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
                {t("inventory.surface")}
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label={t("common.all")}
                  active={!filters.surface}
                  onClick={() => replaceFilters({ surface: null })}
                />
                {facets.surfaces.map((item) => (
                  <FilterChip
                    key={item.value}
                    label={`${item.value} (${item.count})`}
                    active={filters.surface === item.value}
                    onClick={() =>
                      replaceFilters({
                        surface:
                          filters.surface === item.value ? null : item.value,
                      })
                    }
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  {t("inventory.collection")}
                </span>
                <select
                  value={filters.collectionId ?? ""}
                  onChange={(event) =>
                    replaceFilters({
                      collectionId: event.target.value || null,
                    })
                  }
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="">{t("inventory.allCollections")}</option>
                  {facets.collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name} ({collection.count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  {t("inventory.brand")}
                </span>
                <select
                  value={filters.brandId ?? ""}
                  onChange={(event) =>
                    replaceFilters({
                      brandId: event.target.value || null,
                    })
                  }
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="">{t("inventory.allBrands")}</option>
                  {facets.brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name} ({brand.count})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => {
              router.replace("/products", { scroll: false });
            }}
            className="text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            {t("inventory.resetFilters")}
          </button>
        ) : null}
      </div>

      {productsQuery.isLoading || (canReadInventory && balancesQuery.isLoading) ? (
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          {t("inventory.loadingCatalog")}
        </div>
      ) : null}

      {productsQuery.isError ? (
        <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {t("inventory.loadFailed")}
        </div>
      ) : null}

      {!productsQuery.isLoading && !productsQuery.isError ? (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t("inventory.skuDecor")}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t("inventory.thickness")}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t("inventory.length")}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t("inventory.width")}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t("inventory.m2PerSheet")}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  {t("inventory.basePrice")}
                </th>
                {canSeePurchasePrice ? (
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    {t("inventory.purchasePrice")}
                  </th>
                ) : null}
                {canReadInventory ? (
                  <>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">{t("inventory.onHand")}</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">{t("inventory.reserved")}</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">{t("inventory.available")}</th>
                  </>
                ) : null}
                <th className="px-3 py-2 text-right font-semibold text-slate-700">
                  {t("inventory.calculation")}
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
                    {canReadInventory ? (
                      <>
                        <td className="px-3 py-3 text-slate-700">{formatNumber(balance?.onHand)}</td>
                        <td className="px-3 py-3 text-slate-700">{formatNumber(balance?.reserved)}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900">{formatNumber(balance?.available)}</td>
                      </>
                    ) : null}
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setCalculatorProduct(product)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {t("inventory.m2ToSheets")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {products.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600">
              {t("inventory.empty")}
            </div>
          ) : null}
        </div>
      ) : null}

      <Pagination
        page={filters.page}
        totalPages={totalPages}
        total={total}
        onPageChange={(nextPage) =>
          replaceFilters({ page: nextPage }, false)
        }
      />

      <HplCalculatorModal
        product={calculatorProduct}
        onClose={() => setCalculatorProduct(null)}
      />
    </div>
  );
}
