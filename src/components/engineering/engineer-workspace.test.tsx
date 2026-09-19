import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EngineerWorkspace } from './engineer-workspace';
import type { EngineeringWorkspace } from '@/hooks/use-engineering';
import { apiClient } from '@/lib/api-client';

const useAuthMock = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/hooks/use-upload', () => ({
  useDownloadFile: () => ({ mutate: vi.fn(), isPending: false }),
}));

function axiosError(status: number, message: string): AxiosError {
  return new AxiosError(message, 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: status === 403 ? 'Forbidden' : 'Error',
    headers: {},
    config: { headers: {} } as never,
    data: { statusCode: status, message },
  });
}

function workspace(overrides: Partial<EngineeringWorkspace> = {}): EngineeringWorkspace {
  return {
    lead: {
      id: 'lead-1',
      title: 'Фасад школы',
      source: 'site',
      status: 'IN_PROGRESS',
      ownerId: 'manager-1',
      createdAt: '2026-09-19T10:00:00.000Z',
      updatedAt: '2026-09-19T10:00:00.000Z',
      owner: {
        id: 'manager-1',
        firstName: 'Мария',
        lastName: 'Менеджер',
        email: 'manager1@hpl.com',
      },
      client: {
        id: 'client-1',
        name: 'Школа №1',
        phone: '+998901111111',
        email: 'school@example.com',
      },
      projectObject: {
        id: 'object-1',
        name: 'Главный корпус',
        address: 'Ташкент',
      },
      needDescription: 'Нужен монтаж',
    },
    qualification: {
      id: 'qual-1',
      leadId: 'lead-1',
      installationRequired: true,
      ventFacadeKitRequired: false,
      items: [],
    },
    engineering: {
      id: 'assign-1',
      status: 'ACTIVE',
      engineer: {
        id: 'eng-1',
        firstName: 'Игорь',
        lastName: 'Инженер',
        email: 'engineer@hpl.com',
      },
      assignedBy: {
        id: 'manager-1',
        firstName: 'Мария',
        lastName: 'Менеджер',
      },
      assignedAt: '2026-09-19T10:00:00.000Z',
    },
    activities: [],
    files: [],
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

  return Wrapper;
}

describe('EngineerWorkspace closed states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: {
        permissions: [
          'engineering:read',
          'engineering:return',
          'engineering:complete',
        ],
      },
    });
  });

  it('shows a success state and stops workspace requests after complete', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({ data: workspace() });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { status: 'COMPLETED' } });

    render(<EngineerWorkspace leadId="lead-1" />, { wrapper: createWrapper() });

    expect(
      await screen.findByRole('button', {
        name: 'Завершить первичную квалификацию',
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Завершить первичную квалификацию' }),
    );

    expect(
      await screen.findByText(
        'Первичная инженерная квалификация завершена. Инженерное рабочее место закрыто.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Назад к очереди' }),
    ).toHaveAttribute('href', '/engineering');
    expect(screen.queryByText('Фасад школы')).not.toBeInTheDocument();
    expect(screen.queryByText('Forbidden')).not.toBeInTheDocument();
    expect(screen.queryByText('403')).not.toBeInTheDocument();

    const workspaceGets = vi
      .mocked(apiClient.get)
      .mock.calls.filter(([url]) => url === '/engineering/leads/lead-1');
    expect(workspaceGets).toHaveLength(1);
  });

  it('shows a success state and stops workspace requests after return', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({ data: workspace() });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { status: 'RETURNED' } });

    render(<EngineerWorkspace leadId="lead-1" />, { wrapper: createWrapper() });

    await screen.findByRole('button', { name: 'Вернуть менеджеру' });
    await user.click(screen.getByRole('button', { name: 'Вернуть менеджеру' }));
    await user.type(
      screen.getByPlaceholderText('Что нужно уточнить у менеджера'),
      'Нужны чертежи фасада',
    );
    await user.click(screen.getAllByRole('button', { name: 'Вернуть менеджеру' })[1]);

    expect(
      await screen.findByText(
        'Лид возвращён менеджеру. Инженерное рабочее место закрыто.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Назад к очереди' }),
    ).toHaveAttribute('href', '/engineering');
    expect(screen.queryByText('Фасад школы')).not.toBeInTheDocument();
    expect(screen.queryByText('Forbidden')).not.toBeInTheDocument();

    const workspaceGets = vi
      .mocked(apiClient.get)
      .mock.calls.filter(([url]) => url === '/engineering/leads/lead-1');
    expect(workspaceGets).toHaveLength(1);
  });

  it('shows a no-access state for a stale link without treating 403 as a crash', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      axiosError(403, 'ENGINEERING_ASSIGNMENT_INACTIVE'),
    );

    render(<EngineerWorkspace leadId="stale-lead" />, {
      wrapper: createWrapper(),
    });

    expect(
      await screen.findByText(
        'Нет доступа к этому лиду. Назначение завершено, возвращено или передано другому инженеру.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Назад к очереди' }),
    ).toHaveAttribute('href', '/engineering');
    expect(
      screen.queryByText('Не удалось открыть инженерное рабочее место.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('ENGINEERING_ASSIGNMENT_INACTIVE')).not.toBeInTheDocument();
    expect(screen.queryByText('Forbidden')).not.toBeInTheDocument();
  });

  it('shows the same no-access state after the engineer is replaced', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      axiosError(403, 'ENGINEERING_LEAD_FORBIDDEN'),
    );

    render(<EngineerWorkspace leadId="reassigned-lead" />, {
      wrapper: createWrapper(),
    });

    expect(
      await screen.findByText(
        'Нет доступа к этому лиду. Назначение завершено, возвращено или передано другому инженеру.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Назад к очереди' }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(vi.mocked(apiClient.get)).toHaveBeenCalledTimes(1);
    });
  });
});
