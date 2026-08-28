import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/api-client';
import type { SupplierOrder } from '../types/hpl';
import {
  useConfirmSupplierOrderClientDelivery,
  useConfirmSupplierOrderReady,
  useCreateSupplierOrder,
  useShipSupplierOrder,
  useSupplierOrdersByDeal,
  useUpdateSupplierOrderDates,
} from './use-supplier-orders';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

function order(overrides: Partial<SupplierOrder> = {}): SupplierOrder {
  return {
    id: 'so-1',
    dealId: 'deal-1',
    supplierId: 'sup-1',
    status: 'SENT_TO_PRODUCTION',
    createdAt: '2026-08-19T10:00:00.000Z',
    updatedAt: '2026-08-19T10:00:00.000Z',
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return { queryClient, Wrapper };
}

describe('supplier order hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists Deal supplier orders via GET /deals/:dealId/supplier-orders', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [order(), order({ id: 'so-2', supplierId: 'sup-2' })],
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSupplierOrdersByDeal('deal-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiClient.get).toHaveBeenCalledWith('/deals/deal-1/supplier-orders');
    expect(apiClient.get).not.toHaveBeenCalledWith('/supplier-orders/deal-1');
    expect(result.current.data).toHaveLength(2);
  });

  it('creates a supplier order on the Deal-scoped collection', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: order() });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateSupplierOrder(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      dealId: 'deal-1',
      supplierId: 'sup-1',
      orderedAt: '2026-08-19T00:00:00.000Z',
      expectedReadyAt: '2026-08-25T00:00:00.000Z',
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/deals/deal-1/supplier-orders',
      {
        supplierId: 'sup-1',
        orderedAt: '2026-08-19T00:00:00.000Z',
        expectedReadyAt: '2026-08-25T00:00:00.000Z',
      },
    );
  });

  it('patches production dates and invalidates the Deal supplier-order list', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: order() });
    const { queryClient, Wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateSupplierOrderDates(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      id: 'so-1',
      dealId: 'deal-1',
      expectedReadyAt: '2026-08-26T00:00:00.000Z',
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/supplier-orders/so-1/dates', {
      expectedReadyAt: '2026-08-26T00:00:00.000Z',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['supplier-orders'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['supplier-orders', 'deal', 'deal-1'],
    });
  });

  it('confirms readiness through the dedicated endpoint', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: order({ status: 'READY_FOR_SHIPMENT' }),
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConfirmSupplierOrderReady(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({ id: 'so-1', dealId: 'deal-1' });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/supplier-orders/so-1/confirm-ready',
    );
  });

  it('ships through PATCH status SHIPPED, not READY_TO_SHIP', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: order({ status: 'SHIPPED' }),
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useShipSupplierOrder(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({ id: 'so-1', dealId: 'deal-1' });

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/supplier-orders/so-1/status',
      { status: 'SHIPPED' },
    );
    expect(apiClient.patch).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'READY_FOR_SHIPMENT' }),
    );
  });

  it('confirms client delivery through the dedicated endpoint', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: order({ status: 'DELIVERED' }),
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConfirmSupplierOrderClientDelivery(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({ id: 'so-1', dealId: 'deal-1' });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/supplier-orders/so-1/confirm-client-delivery',
    );
  });
});
