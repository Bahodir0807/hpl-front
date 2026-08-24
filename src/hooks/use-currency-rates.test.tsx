import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/api-client';
import { useCreateCurrencyRate, useCurrentCurrencyRate } from './use-currency-rates';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
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

  return Wrapper;
}

describe('currency rate hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads the active CNY→USD rate from GET /currency-rates/current', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { fromCurrency: 'CNY', toCurrency: 'USD', rate: '0.14' },
    });
    const { result } = renderHook(() => useCurrentCurrencyRate(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiClient.get).toHaveBeenCalledWith('/currency-rates/current');
    expect(result.current.data).toEqual({
      fromCurrency: 'CNY',
      toCurrency: 'USD',
      rate: '0.14',
    });
  });

  it('creates a rate through POST /currency-rates with a string rate', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        id: 'rate-1',
        fromCurrency: 'CNY',
        toCurrency: 'USD',
        rate: '0.15',
        effectiveFrom: '2026-08-20T00:00:00.000Z',
      },
    });
    const { result } = renderHook(() => useCreateCurrencyRate(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ rate: '0.15' });

    expect(apiClient.post).toHaveBeenCalledWith('/currency-rates', {
      rate: '0.15',
    });
  });
});
