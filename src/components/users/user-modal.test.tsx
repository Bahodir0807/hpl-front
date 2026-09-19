import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/provider';
import { ADMIN_PROVISIONABLE_ROLES } from '../../lib/labels';
import { UserModal } from './user-modal';

vi.mock('../../hooks/use-users', () => ({
  useCreateUser: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false }),
  useUpdateUser: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false }),
  useUsersList: () => ({ users: [] }),
}));

describe('UserModal role assignment', () => {
  it('offers every canonical role and never OBSERVER or FINANCIER', async () => {
    render(<UserModal user={null} isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('option', { name: 'Администратор' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Директор' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Руководитель' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Менеджер' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Бухгалтер' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Кладовщик' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Наблюдатель' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Финансист' })).not.toBeInTheDocument();
    expect(screen.queryByText('OBSERVER')).not.toBeInTheDocument();
    expect(screen.queryByText('FINANCIER')).not.toBeInTheDocument();

    const optionValues = screen
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value);

    expect(optionValues).toEqual([...ADMIN_PROVISIONABLE_ROLES]);
    expect(screen.getAllByRole('option')).toHaveLength(7);
    expect(screen.getByRole('option', { name: 'Инженер' })).toBeInTheDocument();
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

  it('shows the ENGINEER label when editing an engineer', () => {
    render(
      <UserModal
        isOpen
        onClose={vi.fn()}
        user={{
          id: 'u-eng',
          email: 'engineer@hpl.com',
          firstName: 'Игорь',
          lastName: 'Инженер',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          roles: [{ role: { name: 'ENGINEER' } }],
        }}
      />,
    );

    expect(screen.getAllByText('Инженер').length).toBeGreaterThan(0);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

describe('UserModal ENGINEER labels by locale', () => {
  it('offers localized ENGINEER on create in UZ', () => {
    render(
      <I18nProvider initialLocale="uz">
        <UserModal user={null} isOpen onClose={vi.fn()} />
      </I18nProvider>,
    );

    expect(screen.getByRole('option', { name: 'Muhandis' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Muhandis' }),
    ).toHaveValue('ENGINEER');
  });

  it('offers localized ENGINEER on create in EN', () => {
    render(
      <I18nProvider initialLocale="en">
        <UserModal user={null} isOpen onClose={vi.fn()} />
      </I18nProvider>,
    );

    expect(screen.getByRole('option', { name: 'Engineer' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Engineer' }),
    ).toHaveValue('ENGINEER');
  });
});
