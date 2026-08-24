import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

const replace = vi.fn();
const push = vi.fn();
let authState: {
  user: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  } | null;
  isInitialized: boolean;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  hasPermission: ReturnType<typeof vi.fn>;
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
}));

vi.mock('../../context/auth-context', () => ({
  useAuth: () => authState,
}));

describe('LoginPage auth navigation', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    authState = {
      user: null,
      isInitialized: true,
      login: vi.fn(),
      logout: vi.fn(),
      hasPermission: vi.fn(),
    };
  });

  it('navigates once to the authenticated user landing route after login', async () => {
    const authenticatedUser = {
      id: 'admin-1',
      email: 'admin@hpl.local',
      roles: ['ADMIN'],
      permissions: ['auth:me', 'users:read'],
    };
    authState.login = vi.fn().mockResolvedValue(authenticatedUser);

    const { container } = render(<LoginPage />);
    const [emailInput] = screen.getAllByRole('textbox');
    const passwordInput = container.querySelector('input[type="password"]');

    expect(passwordInput).not.toBeNull();

    await userEvent.type(emailInput, 'admin@hpl.local');
    await userEvent.type(passwordInput!, 'HplMvp2026!');
    await userEvent.click(container.querySelector('button[type="submit"]')!);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledTimes(1);
    });
    expect(replace).toHaveBeenCalledWith('/users');
    expect(push).not.toHaveBeenCalled();
  });

  it('redirects an already authenticated user to their landing route once', async () => {
    authState.user = {
      id: 'accountant-1',
      email: 'accountant@hpl.local',
      roles: ['ACCOUNTANT'],
      permissions: ['auth:me', 'orders:read'],
    };

    render(<LoginPage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledTimes(1);
    });
    expect(replace).toHaveBeenCalledWith('/orders');
    expect(push).not.toHaveBeenCalled();
  });

  it('does not redirect while auth initialization is pending', () => {
    authState.isInitialized = false;

    render(<LoginPage />);

    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
