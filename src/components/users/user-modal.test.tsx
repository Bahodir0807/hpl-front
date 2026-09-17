import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserModal } from './user-modal';

vi.mock('../../hooks/use-users', () => ({
  useCreateUser: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false }),
  useUpdateUser: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false }),
  useUsersList: () => ({ users: [] }),
}));

describe('UserModal role assignment', () => {
  it('offers only ADMIN-assignable roles and never OBSERVER or FINANCIER', async () => {
    render(<UserModal user={null} isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('option', { name: 'Администратор' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Менеджер' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Кладовщик' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Наблюдатель' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Финансист' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Директор' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Руководитель' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Бухгалтер' })).not.toBeInTheDocument();
    expect(screen.queryByText('OBSERVER')).not.toBeInTheDocument();
    expect(screen.queryByText('FINANCIER')).not.toBeInTheDocument();

    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('displays protected role labels when editing an existing user', () => {
    render(
      <UserModal
        isOpen
        onClose={vi.fn()}
        user={{
          id: 'u-1',
          email: 'head@hpl.local',
          firstName: 'Анна',
          lastName: 'Иванова',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          roles: [{ role: { name: 'HEAD' } }],
        }}
      />,
    );

    expect(screen.getAllByText('Руководитель').length).toBeGreaterThan(0);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
