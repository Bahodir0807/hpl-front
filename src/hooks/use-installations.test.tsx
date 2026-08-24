import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/api-client';
import type { DealInstallation } from './use-deals';
import {
  type InstallationJob,
  useConfirmInstallerInstallation,
  useConfirmSupervisorInstallation,
  useInstallationJob,
  useInstallationJobs,
  useScheduleInstallation,
  useStartInstallation,
  useUpdateInstallationAssessment,
} from './use-installations';

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

function installation(overrides: Partial<DealInstallation> = {}): DealInstallation {
  return {
    id: 'inst-1',
    dealId: 'deal-1',
    status: 'SCHEDULED',
    expectedInstallationAt: '2026-08-25T00:00:00.000Z',
    expectedCompletionAt: '2026-08-26T00:00:00.000Z',
    ...overrides,
  };
}

function job(overrides: Partial<InstallationJob> = {}): InstallationJob {
  return {
    id: 'inst-1',
    dealId: 'deal-foreign',
    status: 'SCHEDULED',
    expectedInstallationAt: '2026-08-25T00:00:00.000Z',
    expectedCompletionAt: '2026-08-26T00:00:00.000Z',
    installationRequiredSnapshot: true,
    dealCompletedAt: null,
    deal: {
      id: 'deal-foreign',
      title: 'Фасад школы',
      stage: 'WON',
      completedAt: null,
      installationRequiredSnapshot: true,
      client: { id: 'client-1', name: 'Школа №1', phone: '+79990000000' },
      projectObject: { id: 'obj-1', name: 'Корпус А', address: 'ул. Мира, 1' },
    },
    delivery: {
      fulfillmentSource: 'SUPPLIER_ORDER',
      materialsDelivered: true,
      orderStatus: null,
      supplierOrderStatuses: ['DELIVERED'],
    },
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

function requestedUrls(): string[] {
  return vi.mocked(apiClient.get).mock.calls.map(([url]) => String(url));
}

describe('installation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('discovers jobs from GET /installations without scanning /deals', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/installations') {
        return {
          data: {
            items: [
              job(),
              job({
                id: 'inst-2',
                dealId: 'deal-2',
                deal: {
                  id: 'deal-2',
                  title: 'Офис',
                  client: { id: 'client-2', name: 'ООО Альфа' },
                },
              }),
            ],
            total: 2,
            page: 1,
            limit: 20,
          },
        };
      }
      throw new Error(`unexpected ${url}`);
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useInstallationJobs({
          page: 1,
          limit: 20,
          requiringAction: true,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.items.map((item) => item.dealId)).toEqual([
      'deal-foreign',
      'deal-2',
    ]);
    expect(apiClient.get).toHaveBeenCalledWith('/installations', {
      params: { page: 1, limit: 20, requiringAction: true },
    });
    expect(requestedUrls().some((url) => url.startsWith('/deals'))).toBe(false);
  });

  it('returns a foreign Deal installation for INSTALLER without Deal ownership', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        items: [job({ dealId: 'deal-owned-by-manager' })],
        total: 1,
        page: 1,
        limit: 20,
      },
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useInstallationJobs({ page: 1, limit: 20, requiringAction: true }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.items[0]?.dealId).toBe('deal-owned-by-manager');
    expect(result.current.data?.items[0]?.deal.title).toBe('Фасад школы');
    expect(requestedUrls()).toEqual(['/installations']);
  });

  it('resolves a job by installation id via GET /installations/:id', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/installations/inst-1') {
        return { data: job() };
      }
      throw new Error(`unexpected ${url}`);
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useInstallationJob('inst-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.dealId).toBe('deal-foreign');
    expect(apiClient.get).toHaveBeenCalledWith('/installations/inst-1');
    expect(requestedUrls().some((url) => url.startsWith('/deals'))).toBe(false);
  });

  it('does not retry a 404 installation detail lookup', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      new AxiosError(
        'Not found',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: { headers: {} } as never,
          data: { message: 'Installation job not found' },
        },
      ),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useInstallationJob('missing'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(apiClient.get).toHaveBeenCalledWith('/installations/missing');
  });

  it('schedules through the dedicated backend endpoint', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: installation() });
    const { Wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useScheduleInstallation(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      dealId: 'deal-1',
      expectedInstallationAt: '2026-08-25T00:00:00.000Z',
      expectedCompletionAt: '2026-08-26T00:00:00.000Z',
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/deals/deal-1/installation/schedule',
      {
        expectedInstallationAt: '2026-08-25T00:00:00.000Z',
        expectedCompletionAt: '2026-08-26T00:00:00.000Z',
      },
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['installations'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['deals'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['deals', 'deal-1'] });
  });

  it('sends assessment comments to the assessment endpoint', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: installation() });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateInstallationAssessment(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      dealId: 'deal-1',
      assessmentComment: 'Нужен доступ на кровлю',
      workComment: 'Дополнительный выезд',
    });

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/deals/deal-1/installation/assessment',
      {
        assessmentComment: 'Нужен доступ на кровлю',
        workComment: 'Дополнительный выезд',
      },
    );
  });

  it('starts installation through the dedicated start action', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: installation({ status: 'IN_PROGRESS', startedAt: '2026-08-20T08:00:00.000Z' }),
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useStartInstallation(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({ dealId: 'deal-1' });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/deals/deal-1/installation/start',
    );
  });

  it('confirms installer and supervisor through dedicated endpoints and refreshes Deal completion', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: installation() });
    const { Wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const installer = renderHook(() => useConfirmInstallerInstallation(), {
      wrapper: Wrapper,
    });
    const supervisor = renderHook(() => useConfirmSupervisorInstallation(), {
      wrapper: Wrapper,
    });

    await installer.result.current.mutateAsync({ dealId: 'deal-1' });
    await supervisor.result.current.mutateAsync({ dealId: 'deal-1' });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/deals/deal-1/installation/confirm-installer',
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      '/deals/deal-1/installation/confirm-supervisor',
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['installations'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['deals'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['deals', 'deal-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });
});
