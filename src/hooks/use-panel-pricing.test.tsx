import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/api-client';
import {
  useCreateThicknessPricing,
  useThicknessPricing,
} from './use-panel-pricing';

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

  return { Wrapper, queryClient };
}

describe('panel thickness pricing hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists prices from GET /panel-pricing/thickness', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [
        {
          id: 'price-1',
          supplierId: 'sup-1',
          qualityClassId: 'q-1',
          thicknessMm: '2.9',
          basePricePerM2: '80',
          currencyCode: 'CNY',
          isActive: true,
        },
      ],
    });
    const { result } = renderHook(() => useThicknessPricing(), {
      wrapper: createWrapper().Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiClient.get).toHaveBeenCalledWith('/panel-pricing/thickness');
    expect(result.current.data?.[0]?.basePricePerM2).toBe('80');
  });

  it('posts the HEAD create payload to POST /panel-pricing/thickness and invalidates pricing/calculation keys', async () => {
    const payload = {
      panelTypeId: 'type-furniture',
      supplierId: 'sup-wuya',
      qualityClassId: 'q-economy',
      thicknessMm: '2.9',
      basePricePerM2: '80',
    };
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'price-1', ...payload, currencyCode: 'CNY', isActive: true },
    });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateThicknessPricing(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync(payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/panel-pricing/thickness',
      payload,
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['panel-pricing'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['calculations'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['lead-workspace'] });
  });
});
