import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/api-client';
import { orderStatusLabels } from '../lib/labels';
import { useOrders } from './use-orders';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('Order status contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, limit: 20 },
    });
  });

  it('uses the backend READY_FOR_SHIPMENT enum in query params', async () => {
    const { result } = renderHook(
      () => useOrders({ status: 'READY_FOR_SHIPMENT', page: 1, limit: 20 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith('/orders', {
      params: { status: 'READY_FOR_SHIPMENT', page: 1, limit: 20 },
    });
  });

  it('has labels for every backend OrderStatus value', () => {
    expect(Object.keys(orderStatusLabels).sort()).toEqual([
      'CANCELLED',
      'COMPLETED',
      'CONFIRMED',
      'DRAFT',
      'PAID',
      'PARTIALLY_PAID',
      'PARTIALLY_SHIPPED',
      'PENDING_SUPPLIER',
      'READY_FOR_SHIPMENT',
      'SHIPPED',
      'WAITING_PAYMENT',
      'WAITING_STOCK',
    ]);
  });
});
