import { Suspense } from "react";
import { ProductsCatalogClient } from "@/components/products/products-catalog-client";

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Загрузка каталога...
        </div>
      }
    >
      <ProductsCatalogClient />
    </Suspense>
  );
}
