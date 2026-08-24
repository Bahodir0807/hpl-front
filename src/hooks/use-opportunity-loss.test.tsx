import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/api-client';
import { useLoseLead } from './use-leads';
import { useLoseDeal } from './use-deals';

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

describe('structured opportunity loss', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes a Lead through POST /leads/:id/lose with reason and comment', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'lead-1', status: 'LOST', lostReasonCode: 'OTHER' },
    });
    const { result } = renderHook(() => useLoseLead(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: 'lead-1',
      reason: 'OTHER',
      comment: 'Клиент отказался',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/leads/lead-1/lose', {
      reason: 'OTHER',
      comment: 'Клиент отказался',
    });
    expect(apiClient.post).not.toHaveBeenCalledWith(
      '/leads/lead-1/disqualify',
      expect.anything(),
    );
  });

  it('closes a Deal through POST /deals/:id/lose instead of generic stage mutation', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'deal-1', stage: 'LOST', lostReasonCode: 'PRICE' },
    });
    const { result } = renderHook(() => useLoseDeal(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: 'deal-1',
      reason: 'PRICE',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/deals/deal-1/lose', {
      reason: 'PRICE',
    });
    expect(apiClient.post).not.toHaveBeenCalledWith(
      '/deals/deal-1/stage',
      expect.anything(),
    );
  });
});
