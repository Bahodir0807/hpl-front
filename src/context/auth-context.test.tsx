import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContextProvider, useAuth, type AuthUser } from './auth-context';
import { apiClient } from '../lib/api-client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

function LoginProbe({ onResolved }: { onResolved: (user: AuthUser) => void }) {
  const { login } = useAuth();

  return (
    <button
      type="button"
      onClick={() => {
        void login('admin@hpl.local', 'HplMvp2026!').then(onResolved);
      }}
    >
      sign in
    </button>
  );
}

describe('AuthContextProvider login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/auth/session') {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({ hasSession: false }),
        } as unknown as Response);
      }

      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as Response);
    });
  });

  it('returns the authenticated /auth/me user payload after login', async () => {
    const authenticatedUser: AuthUser = {
      id: 'admin-1',
      email: 'admin@hpl.local',
      roles: ['ADMIN'],
      permissions: ['auth:me', 'users:read'],
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: authenticatedUser,
    });
    const onResolved = vi.fn();

    render(
      <AuthContextProvider>
        <LoginProbe onResolved={onResolved} />
      </AuthContextProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'sign in' }));

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith(authenticatedUser);
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: 'admin@hpl.local',
        password: 'HplMvp2026!',
      }),
    });
    expect(apiClient.get).toHaveBeenLastCalledWith('/auth/me');
  });
});
