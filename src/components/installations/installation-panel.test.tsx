import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Deal, DealInstallation } from '@/hooks/use-deals';
import { InstallationPanel } from './installation-panel';

const useAuthMock = vi.fn();
const useDealInstallationMock = vi.fn();
const useUsersListMock = vi.fn();
const scheduleMutate = vi.fn();
const assessMutate = vi.fn();
const startMutate = vi.fn();
const installerMutate = vi.fn();
const supervisorMutate = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/use-installations', () => ({
  useDealInstallation: (...args: unknown[]) => useDealInstallationMock(...args),
  useScheduleInstallation: () => ({
    mutateAsync: scheduleMutate,
    isPending: false,
  }),
  useUpdateInstallationAssessment: () => ({
    mutateAsync: assessMutate,
    isPending: false,
  }),
  useStartInstallation: () => ({
    mutateAsync: startMutate,
    isPending: false,
  }),
  useConfirmInstallerInstallation: () => ({
    mutateAsync: installerMutate,
    isPending: false,
  }),
  useConfirmSupervisorInstallation: () => ({
    mutateAsync: supervisorMutate,
    isPending: false,
  }),
}));

vi.mock('@/hooks/use-users', () => ({
  useUsersList: () => useUsersListMock(),
}));

function auth(permissions: string[], roles: string[], id = 'user-1') {
  return {
    user: {
      id,
      email: 'user@hpl.local',
      roles,
      permissions,
    },
    hasPermission: (slug: string) => permissions.includes(slug),
    isInitialized: true,
    login: vi.fn(),
    logout: vi.fn(),
  };
}

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'deal-1',
    title: 'Фасад школы',
    stage: 'WON',
    clientId: 'client-1',
    ownerId: 'owner-1',
    totalAmount: '0',
    createdAt: '2026-08-19T10:00:00.000Z',
    updatedAt: '2026-08-19T10:00:00.000Z',
    installationRequiredSnapshot: true,
    client: { id: 'client-1', name: 'Школа №1' },
    supplierOrders: [{ id: 'so-1', status: 'DELIVERED' }],
    ...overrides,
  };
}

function installation(
  overrides: Partial<DealInstallation> = {},
): DealInstallation {
  return {
    id: 'inst-1',
    dealId: 'deal-1',
    status: 'SCHEDULED',
    expectedInstallationAt: '2026-08-25T09:00:00.000Z',
    expectedCompletionAt: '2026-08-26T18:00:00.000Z',
    ...overrides,
  };
}

describe('InstallationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDealInstallationMock.mockReturnValue({ data: undefined, isLoading: false });
    useUsersListMock.mockReturnValue({ usersById: new Map() });
    scheduleMutate.mockResolvedValue(installation());
    assessMutate.mockResolvedValue(installation());
    startMutate.mockResolvedValue(installation());
    installerMutate.mockResolvedValue(installation());
    supervisorMutate.mockResolvedValue(installation());
  });

  it('lets HEAD schedule installation dates', async () => {
    useAuthMock.mockReturnValue(
      auth(
        ['installation:schedule', 'installation:assess', 'installation:confirm_supervisor'],
        ['HEAD'],
        'head-1',
      ),
    );

    render(
      <InstallationPanel
        dealId="deal-1"
        deal={deal()}
        installation={null}
      />,
    );

    expect(screen.getByRole('button', { name: 'Запланировать монтаж' })).toBeInTheDocument();
  });

  it('lets INSTALLER start and confirm work, but not schedule or supervise', async () => {
    useAuthMock.mockReturnValue(
      auth(
        ['deals:read', 'installation:assess', 'installation:confirm_work'],
        ['INSTALLER'],
        'installer-1',
      ),
    );

    render(
      <InstallationPanel
        dealId="deal-1"
        deal={deal()}
        installation={installation()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Начать монтаж' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Подтвердить как монтажник' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Запланировать монтаж' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Подтвердить как руководитель' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Начать монтаж' }));
    expect(startMutate).toHaveBeenCalledWith({ dealId: 'deal-1' });

    await userEvent.click(
      screen.getByRole('button', { name: 'Подтвердить как монтажник' }),
    );
    expect(installerMutate).toHaveBeenCalledWith({ dealId: 'deal-1' });
  });

  it('lets DIRECTOR perform supervisor confirmation', async () => {
    useAuthMock.mockReturnValue(
      auth(
        ['installation:schedule', 'installation:assess', 'installation:confirm_supervisor'],
        ['DIRECTOR'],
        'director-1',
      ),
    );

    render(
      <InstallationPanel
        dealId="deal-1"
        deal={deal()}
        installation={installation({
          installerConfirmedAt: '2026-08-20T10:00:00.000Z',
          installerConfirmedById: 'installer-1',
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Подтвердить как руководитель' }),
    );
    expect(supervisorMutate).toHaveBeenCalledWith({ dealId: 'deal-1' });
  });

  it('does not show installer or supervisor actions to MANAGER or ADMIN-only', () => {
    useAuthMock.mockReturnValue(auth(['deals:read'], ['MANAGER'], 'manager-1'));
    const { rerender } = render(
      <InstallationPanel
        dealId="deal-1"
        deal={deal()}
        installation={installation()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Начать монтаж' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Подтвердить как руководитель' }),
    ).not.toBeInTheDocument();

    useAuthMock.mockReturnValue(auth(['users:read'], ['ADMIN'], 'admin-1'));
    rerender(
      <InstallationPanel
        dealId="deal-1"
        deal={deal()}
        installation={installation()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Начать монтаж' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Запланировать монтаж' }),
    ).not.toBeInTheDocument();
  });

  it('shows the not-required state without operational controls', () => {
    useAuthMock.mockReturnValue(
      auth(['installation:schedule'], ['HEAD'], 'head-1'),
    );

    render(
      <InstallationPanel
        dealId="deal-1"
        deal={deal({ installationRequiredSnapshot: false })}
        installation={null}
      />,
    );

    expect(screen.getByText('Монтаж не требуется.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Запланировать монтаж' }),
    ).not.toBeInTheDocument();
  });

  it('saves operational assessment through the assessment endpoint payload', async () => {
    useAuthMock.mockReturnValue(
      auth(['installation:assess', 'installation:confirm_work'], ['INSTALLER'], 'installer-1'),
    );

    render(
      <InstallationPanel
        dealId="deal-1"
        deal={deal()}
        installation={installation()}
      />,
    );

    await userEvent.type(
      screen.getByLabelText('Комментарий оценки'),
      'Нужен доступ',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить оценку' }));

    expect(assessMutate).toHaveBeenCalledWith({
      dealId: 'deal-1',
      assessmentComment: 'Нужен доступ',
      workComment: '',
    });
  });
});
