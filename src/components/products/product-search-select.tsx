'use client';

import { useMemo, useState } from 'react';
import { SearchCombobox } from '@/components/ui/search-combobox';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useProducts } from '@/hooks/use-inventory';

type ProductSearchSelectProps = {
  value: string;
  onChange: (productId: string) => void;
  disabled?: boolean;
};

export function ProductSearchSelect({
  value,
  onChange,
  disabled = false,
}: ProductSearchSelectProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const productsQuery = useProducts({
    search: debouncedSearch.trim() || undefined,
    status: 'ACTIVE',
    limit: 20,
    page: 1,
  });
  const options = useMemo(
    () =>
      (productsQuery.data?.items ?? []).map((product) => ({
        value: product.id,
        label: product.name,
        description: [product.sku, product.brand?.name, product.supplier?.name]
          .filter(Boolean)
          .join(' · '),
      })),
    [productsQuery.data?.items],
  );

  return (
    <SearchCombobox
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Выберите товар"
      searchPlaceholder="Название, SKU или бренд"
      emptyLabel="Товары не найдены"
      disabled={disabled}
      loading={productsQuery.isLoading}
      onSearchChange={setSearch}
    />
  );
}
