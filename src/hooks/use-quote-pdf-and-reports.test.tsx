import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { apiClient } from '../lib/api-client';
import { useDownloadQuotePdf, useDownloadQuoteDocx } from './use-quotes';
import { useReportsOverview } from './use-reports';
import { waitFor } from '@testing-library/react';

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

describe('quote PDF download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:quote'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('downloads GET /quotes/:id/pdf as a binary attachment', async () => {
    const click = vi.fn();
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click,
        } as unknown as HTMLAnchorElement;
      }
      return originalCreate(tag);
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: new Blob(['%PDF'], { type: 'application/pdf' }),
      headers: {
        'content-disposition': 'attachment; filename="quote-q1.pdf"',
      },
    });

    const { result } = renderHook(() => useDownloadQuotePdf(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('q1');

    expect(apiClient.get).toHaveBeenCalledWith('/quotes/q1/pdf', {
      responseType: 'blob',
    });
    expect(click).toHaveBeenCalled();
  });

  it('downloads GET /quotes/:id/docx as a binary attachment', async () => {
    const click = vi.fn();
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click,
        } as unknown as HTMLAnchorElement;
      }
      return originalCreate(tag);
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: new Blob(['PK'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      headers: {
        'content-disposition': 'attachment; filename="quote-q1.docx"',
      },
    });

    const { result } = renderHook(() => useDownloadQuoteDocx(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('q1');

    expect(apiClient.get).toHaveBeenCalledWith('/quotes/q1/docx', {
      responseType: 'blob',
    });
    expect(click).toHaveBeenCalled();
  });

  it('surfaces a download error instead of rendering binary as text', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: { headers: {} } as never,
        data: { message: 'Forbidden' },
      }),
    );

    const { result } = renderHook(() => useDownloadQuotePdf(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync('q1')).rejects.toBeTruthy();
  });
});

describe('reports overview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads GET /reports/overview without inventing metrics', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        leads: { total: 12, lost: 3, lossReasons: { PRICE: 2 } },
        deals: { won: 4, operationallyCompleted: 1, lossReasons: { NO_STOCK: 1 } },
      },
    });

    const { result } = renderHook(() => useReportsOverview({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiClient.get).toHaveBeenCalledWith('/reports/overview', {
      params: {},
    });
    expect(result.current.data?.deals?.operationallyCompleted).toBe(1);
    expect(result.current.data?.leads?.lossReasons).toEqual({ PRICE: 2 });
  });
});
