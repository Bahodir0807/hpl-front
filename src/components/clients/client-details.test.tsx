import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from '@/hooks/use-clients';
import { ClientDetails } from './client-details';

const useAuthMock = vi.fn();
const useClientMock = vi.fn();
const useClientTimelineMock = vi.fn();
const useUsersListMock = vi.fn();
const updateMutate = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/use-clients', () => ({
  useClient: (...args: unknown[]) => useClientMock(...args),
  useClientTimeline: (...args: unknown[]) => useClientTimelineMock(...args),
  useAddContact: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddProjectObject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateClient: () => ({
    mutateAsync: updateMutate,
    isPending: false,
  }),
}));

vi.mock('@/hooks/use-users', () => ({
  useUsersList: () => useUsersListMock(),
}));

function client(overrides: Partial<Client> = {}): Client {
  return {
    id: 'client-1',
    type: 'COMPANY',
    name: 'ООО Фасад',
    status: 'ACTIVE',
    ownerId: 'owner-1',
    phone: '+998901112233',
    email: 'office@fasad.uz',
    createdAt: '2026-08-19T10:00:00.000Z',
    updatedAt: '2026-08-19T10:00:00.000Z',
    ...overrides,
  };
}

describe('ClientDetails phone/email edit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMutate.mockResolvedValue(client());
    useAuthMock.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'manager@hpl.local',
        roles: ['MANAGER'],
        permissions: ['clients:read', 'clients:update'],
      },
      hasPermission: (slug: string) =>
        ['clients:read', 'clients:update'].includes(slug),
      isInitialized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
    useClientMock.mockReturnValue({
      data: client(),
      isLoading: false,
      isError: false,
    });
    useClientTimelineMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    useUsersListMock.mockReturnValue({
      users: [],
      usersById: new Map(),
    });
  });

  it('prefills existing phone and email', () => {
    render(<ClientDetails clientId="client-1" />);

    expect(screen.getByDisplayValue('+998901112233')).toBeInTheDocument();
    expect(screen.getByDisplayValue('office@fasad.uz')).toBeInTheDocument();
  });

  it('sends modified phone and email on update', async () => {
    render(<ClientDetails clientId="client-1" />);

    const phone = screen.getByDisplayValue('+998901112233');
    const email = screen.getByDisplayValue('office@fasad.uz');
    await userEvent.clear(phone);
    await userEvent.type(phone, '+998909998877');
    await userEvent.clear(email);
    await userEvent.type(email, 'new@fasad.uz');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(updateMutate).toHaveBeenCalledWith({
      id: 'client-1',
      phone: '+998909998877',
      email: 'new@fasad.uz',
    });
  });
});
