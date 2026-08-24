import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { AxiosError } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstallationJob } from '@/hooks/use-installations';
import { apiClient } from '@/lib/api-client';
import { getRelatedEntityHref } from '@/lib/entity-routes';
import { InstallationJobsPage } from './installation-jobs-page';

const useAuthMock = vi.fn();
const replace = vi.fn();
let search = new URLSearchParams();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => search,
}));

vi.mock('@/components/installations/installation-panel', () => ({
  InstallationPanel: ({
    dealId,
    job,
  }: {
    dealId: string;
    job?: { id: string } | null;
  }) => <div>Панель монтажа {dealId} {job?.id ?? ''}</div>,
}));

function job(overrides: Partial<InstallationJob> = {}): InstallationJob {
  const id = overrides.id ?? 'inst-deal-1';
  const dealId = overrides.dealId ?? 'deal-1';
  return {
    id,
    dealId,
    status: 'SCHEDULED',
    expectedInstallationAt: '2026-08-25T09:00:00.000Z',
    expectedCompletionAt: '2026-08-26T18:00:00.000Z',
    installationRequiredSnapshot: true,
    dealCompletedAt: null,
    deal: {
      id: dealId,
      title: overrides.deal?.title ?? 'Фасад школы',
      stage: 'WON',
      completedAt: null,
      installationRequiredSnapshot: true,
      client: {
        id: `client-${dealId}`,
        name: overrides.deal?.client.name ?? 'Школа №1',
      },
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

function axiosError(status: number, message: string): AxiosError {
  return new AxiosError(message, 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: status === 403 ? 'Forbidden' : 'Error',
    headers: {},
    config: { headers: {} } as never,
    data: { message },
  });
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

  return Wrapper;
}

function requestedUrls(): string[] {
  return vi.mocked(apiClient.get).mock.calls.map(([url]) => String(url));
}

describe('InstallationJobsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search = new URLSearchParams();
    useAuthMock.mockReturnValue({
      user: {
        id: 'installer-1',
        roles: ['INSTALLER'],
        permissions: ['deals:read', 'installation:confirm_work', 'installation:assess'],
      },
      logout: vi.fn(),
    });
  });

  it('renders jobs from the dedicated installation list, not GET /deals', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/installations') {
        return {
          data: {
            items: [
              job({
                id: 'inst-1',
                dealId: 'deal-foreign',
                deal: {
                  id: 'deal-foreign',
                  title: 'Фасад школы',
                  client: { id: 'client-1', name: 'Школа №1' },
                },
              }),
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

    render(<InstallationJobsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Фасад школы')).toBeInTheDocument();
    expect(screen.getByText('Офис')).toBeInTheDocument();
    expect(screen.getByText('Школа №1')).toBeInTheDocument();
    expect(screen.getByText('ООО Альфа')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/installations', {
      params: { page: 1, limit: 20, requiringAction: true },
    });
    expect(requestedUrls().some((url) => url.startsWith('/deals'))).toBe(false);
  });

  it('shows a foreign Deal installation returned by the installation API', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        items: [
          job({
            id: 'inst-foreign',
            dealId: 'deal-not-owned',
            deal: {
              id: 'deal-not-owned',
              title: 'Чужая сделка',
              client: { id: 'client-x', name: 'Клиент без владельца' },
            },
          }),
        ],
        total: 1,
        page: 1,
        limit: 20,
      },
    });

    render(<InstallationJobsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Чужая сделка')).toBeInTheDocument();
    expect(
      screen.queryByText('Нет монтажных работ, требующих действий.'),
    ).not.toBeInTheDocument();
    expect(requestedUrls()).toEqual(['/installations']);
  });

  it('shows the required empty copy only when the installation list is empty', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, limit: 20 },
    });

    render(<InstallationJobsPage />, { wrapper: createWrapper() });

    expect(
      await screen.findByText('Нет монтажных работ, требующих действий.'),
    ).toBeInTheDocument();
  });

  it('loads a direct installationId from GET /installations/:id even if it is not on the first page', async () => {
    search = new URLSearchParams('installationId=inst-off-page');
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/installations') {
        return {
          data: {
            items: [
              job({
                id: 'inst-page-1',
                dealId: 'deal-page-1',
                deal: {
                  id: 'deal-page-1',
                  title: 'Первая страница',
                  client: { id: 'c1', name: 'Клиент 1' },
                },
              }),
            ],
            total: 40,
            page: 1,
            limit: 20,
          },
        };
      }
      if (url === '/installations/inst-off-page') {
        return {
          data: job({
            id: 'inst-off-page',
            dealId: 'deal-off-page',
            deal: {
              id: 'deal-off-page',
              title: 'Вторая страница',
              client: { id: 'c2', name: 'Клиент 2' },
            },
          }),
        };
      }
      throw new Error(`unexpected ${url}`);
    });

    render(<InstallationJobsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Первая страница')).toBeInTheDocument();
    expect(await screen.findByText(/Панель монтажа deal-off-page/)).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/installations/inst-off-page');
    expect(requestedUrls().some((url) => url.startsWith('/deals'))).toBe(false);
  });

  it('shows a Russian not-found message for an invalid installationId and keeps the workspace', async () => {
    search = new URLSearchParams('installationId=missing');
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/installations') {
        return {
          data: {
            items: [
              job({
                id: 'inst-1',
                deal: {
                  id: 'deal-1',
                  title: 'Фасад школы',
                  client: { id: 'c1', name: 'Школа №1' },
                },
              }),
            ],
            total: 1,
            page: 1,
            limit: 20,
          },
        };
      }
      if (url === '/installations/missing') {
        throw axiosError(404, 'Installation job not found');
      }
      throw new Error(`unexpected ${url}`);
    });

    render(<InstallationJobsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Фасад школы')).toBeInTheDocument();
    expect(await screen.findByText('Монтажная работа не найдена.')).toBeInTheDocument();
  });

  it('shows 403 copy without logging out', async () => {
    const logout = vi.fn();
    useAuthMock.mockReturnValue({
      user: {
        id: 'admin-1',
        roles: ['ADMIN'],
        permissions: ['users:read'],
      },
      logout,
    });
    vi.mocked(apiClient.get).mockRejectedValue(
      axiosError(403, 'Forbidden'),
    );

    render(<InstallationJobsPage />, { wrapper: createWrapper() });

    expect(
      await screen.findByText('Недостаточно прав для просмотра монтажных работ.'),
    ).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it('routes DealInstallation notifications to the installation id workspace', () => {
    expect(getRelatedEntityHref('DealInstallation', 'inst-1')).toBe(
      '/installations?installationId=inst-1',
    );
  });
});
