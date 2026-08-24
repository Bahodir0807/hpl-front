import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductSearchSelect } from './product-search-select';

vi.mock('@/hooks/use-inventory', () => ({
  useProducts: () => ({
    data: {
      items: [
        {
          id: 'prod-1',
          name: 'HPL Interior 6 мм',
          sku: 'HPL-INT-6',
          brand: { name: 'Wuya' },
        },
      ],
    },
    isLoading: false,
  }),
}));

describe('ProductSearchSelect', () => {
  it('shows product name and SKU and submits the product id', async () => {
    const onChange = vi.fn();
    render(<ProductSearchSelect value="" onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /Выберите товар/ }));
    expect(screen.getByText('HPL Interior 6 мм')).toBeInTheDocument();
    expect(screen.getByText(/HPL-INT-6/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('UUID товара')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('HPL Interior 6 мм'));
    expect(onChange).toHaveBeenCalledWith('prod-1');
  });
});
