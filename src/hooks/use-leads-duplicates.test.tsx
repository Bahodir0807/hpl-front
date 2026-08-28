import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/api-client';
import { useCheckDuplicates } from './use-leads';

vi.mock('../lib/api-client', () => ({
  apiClient: {
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
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('Lead duplicate lookup contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.post).mockResolvedValue({ data: [] });
  });

  it('looks up a duplicate by phone only', async () => {
    const { result } = renderHook(
      () => useCheckDuplicates({ phone: ' +998 (90) 111-22-33 ' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.post).toHaveBeenCalledWith('/clients/check-duplicates', {
      phone: '+998 (90) 111-22-33',
      inn: undefined,
      email: undefined,
      name: undefined,
    });
  });

  it('looks up a duplicate by INN only and keeps it as a string', async () => {
    const { result } = renderHook(
      () => useCheckDuplicates({ inn: ' 7700000000 ' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.post).toHaveBeenCalledWith('/clients/check-duplicates', {
      phone: undefined,
      inn: '7700000000',
      email: undefined,
      name: undefined,
    });
  });

  it('sends phone and INN together when the duplicate matches by INN', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: [{ client: { id: 'client-1' }, reasons: ['MATCH_INN'] }],
    });
    const { result } = renderHook(
      () =>
        useCheckDuplicates({
          phone: '+998901112233',
          inn: '7700000000',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(apiClient.post).toHaveBeenCalledWith('/clients/check-duplicates', {
      phone: '+998901112233',
      inn: '7700000000',
      email: undefined,
      name: undefined,
    });
    expect(result.current.data?.[0]?.reasons).toEqual(['MATCH_INN']);
  });

  it('sends phone and INN together when the duplicate matches by phone', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: [{ client: { id: 'client-2' }, reasons: ['MATCH_PHONE'] }],
    });
    const { result } = renderHook(
      () =>
        useCheckDuplicates({
          phone: '+998901112233',
          inn: '7711111111',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(apiClient.post).toHaveBeenCalledWith('/clients/check-duplicates', {
      phone: '+998901112233',
      inn: '7711111111',
      email: undefined,
      name: undefined,
    });
    expect(result.current.data?.[0]?.reasons).toEqual(['MATCH_PHONE']);
  });

  it('returns no matches when none of the supplied identifiers match', async () => {
    const { result } = renderHook(
      () =>
        useCheckDuplicates({
          phone: '+998901112233',
          inn: '7722222222',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(apiClient.post).toHaveBeenCalledWith('/clients/check-duplicates', {
      phone: '+998901112233',
      inn: '7722222222',
      email: undefined,
      name: undefined,
    });
  });
});
