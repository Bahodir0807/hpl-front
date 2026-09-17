'use client';

import { Suspense } from 'react';
import { ProductsCatalogClient } from '@/components/products/products-catalog-client';
import { useI18n } from '@/i18n/provider';

export default function ProductsPage() {
  const { t } = useI18n();

  return (
    <Suspense
      fallback={
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          {t('inventory.loadingCatalog')}
        </div>
      }
    >
      <ProductsCatalogClient />
    </Suspense>
  );
}
