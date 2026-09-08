import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/api-client';
import {
  useConvertCalculationRequestToQuote,
  useCreateCalculationRequest,
  useSubmitCalculationRequest,
  useUpdateCalculationRequest,
} from './use-calculation-requests';
import {
  useApproveQuotePricing,
  useClientQuotes,
  useFinalizeQuote,
  usePreviewQuotePricing,
  useQuote,
} from './use-quotes';

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

  return Wrapper;
}

describe('calculation request API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a request via POST /calculations/requests', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'req-1', status: 'draft', calculations: [] },
    });

    const { result } = renderHook(() => useCreateCalculationRequest(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      leadId: 'lead-1',
      notes: 'Пожелание',
      calculations: [
        {
          title: 'Расчёт №1',
          items: [
            {
              panelTypeId: 'type-1',
              qualityClassId: 'q-1',
              thicknessMm: '8',
              requiredAreaM2: '20',
            },
          ],
        },
      ],
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/calculations/requests',
      expect.objectContaining({ leadId: 'lead-1' }),
    );
    expect(vi.mocked(apiClient.post).mock.calls[0][0]).not.toBe(
      '/calculations/calc-1/convert-to-quote',
    );
  });

  it('submits a request to HEAD', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'req-1', status: 'submitted' },
    });

    const { result } = renderHook(() => useSubmitCalculationRequest(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('req-1');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/calculations/requests/req-1/submit',
    );
  });

  it('updates a manager request with per-item supplierId', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { id: 'req-1', status: 'draft', calculations: [] },
    });

    const { result } = renderHook(() => useUpdateCalculationRequest(), {
      wrapper: createWrapper(),
    });
    const body = {
      notes: 'Уточнение клиента',
      calculations: [
        {
          title: 'Расчёт №1',
          items: [
            {
              panelTypeId: 'type-1',
              qualityClassId: 'q-1',
              thicknessMm: '8',
              requiredAreaM2: '20',
              supplierId: 'sup-1',
            },
          ],
        },
      ],
    };

    await result.current.mutateAsync({ id: 'req-1', body });
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/calculations/requests/req-1',
      body,
    );
    expect(body.calculations[0].items[0].supplierId).toBe('sup-1');
  });

  it('converts a request through the new endpoint, not legacy convert', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'quote-1', leadId: 'lead-1', items: [] },
    });

    const { result } = renderHook(
      () => useConvertCalculationRequestToQuote(),
      { wrapper: createWrapper() },
    );

    await result.current.mutateAsync({ id: 'req-1' });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/calculations/requests/req-1/convert-to-quote',
      {},
    );
    expect(vi.mocked(apiClient.post).mock.calls[0][0]).not.toContain(
      '/calculations/req-1/convert-to-quote',
    );
  });
});

describe('quote commercial API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads client quote history via GET /quotes?clientId=', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useClientQuotes('client-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith('/quotes', {
      params: { clientId: 'client-1', limit: 100 },
    });
  });

  it('opens an historical quote with GET /quotes/:id', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { id: 'quote-1', items: [], finalizedAt: '2026-08-21T12:00:00.000Z' },
    });

    const { result } = renderHook(() => useQuote('quote-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith('/quotes/quote-1');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('previews and approves per-item CNY purchase prices through Quote pricing API', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        cnyUsdRate: '0.1',
        sellingCoefficient: '2',
        currencyCode: 'USD',
        items: [],
      },
    });
    const previewHook = renderHook(() => usePreviewQuotePricing(), {
      wrapper: createWrapper(),
    });
    await previewHook.result.current.mutateAsync({
      id: 'quote-1',
      items: [
        { id: 'item-1', purchasePricePerM2Cny: '80' },
        { id: 'item-2', purchasePricePerM2Cny: '120' },
      ],
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/quotes/quote-1/pricing-preview',
      {
        items: [
          { id: 'item-1', purchasePricePerM2Cny: '80' },
          { id: 'item-2', purchasePricePerM2Cny: '120' },
        ],
      },
    );

    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { id: 'quote-1', items: [] },
    });

    const { result } = renderHook(() => useApproveQuotePricing(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: 'quote-1',
      items: [
        { id: 'item-1', purchasePricePerM2Cny: '80' },
        { id: 'item-2', purchasePricePerM2Cny: '120' },
      ],
    });

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/quotes/quote-1/approved-pricing',
      {
        items: [
          { id: 'item-1', purchasePricePerM2Cny: '80' },
          { id: 'item-2', purchasePricePerM2Cny: '120' },
        ],
      },
    );
  });

  it('finalizes a quote via POST /quotes/:id/finalize', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'quote-1', finalizedAt: '2026-08-21T12:00:00.000Z', items: [] },
    });

    const { result } = renderHook(() => useFinalizeQuote(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('quote-1');
    expect(apiClient.post).toHaveBeenCalledWith('/quotes/quote-1/finalize');
  });
});
