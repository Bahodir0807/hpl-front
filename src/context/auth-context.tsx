'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { apiClient } from '../lib/api-client';
import { useI18n } from '../i18n/provider';

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  teamId?: string | null;
  managerId?: string | null;
  roles: string[];
  permissions: string[];
};

type AuthContextValue = {
  user: AuthUser | null;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hasPermission: (slug: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const profileRequestId = useRef(0);

  const loadProfile = useCallback(async (): Promise<AuthUser> => {
    const requestId = ++profileRequestId.current;
    const response = await apiClient.get<AuthUser>('/auth/me');

    if (requestId === profileRequestId.current) {
      setUser(response.data);
      setIsInitialized(true);
    }

    return response.data;
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let message = t('auth.loginFailed');

        try {
          const errorBody = (await response.json()) as { message?: string };
          if (errorBody.message) {
            message = errorBody.message;
          }
        } catch {
          // ignore parse errors
        }

        throw new Error(message);
      }

      return loadProfile();
    },
    [loadProfile, t],
  );

  const logout = useCallback(async (): Promise<void> => {
    profileRequestId.current += 1;

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
      setIsInitialized(true);
      router.push('/login');
    }
  }, [router]);

  const hasPermission = useCallback(
    (slug: string): boolean => user?.permissions.includes(slug) ?? false,
    [user],
  );

  useEffect(() => {
    const requestId = ++profileRequestId.current;

    async function bootstrap(): Promise<void> {
      try {
        const sessionResponse = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        const session = (await sessionResponse.json()) as {
          hasSession?: boolean;
        };

        if (!session.hasSession) {
          if (requestId === profileRequestId.current) {
            setUser(null);
          }
          return;
        }

        const response = await apiClient.get<AuthUser>('/auth/me');
        if (requestId === profileRequestId.current) {
          setUser(response.data);
        }
      } catch {
        if (requestId === profileRequestId.current) {
          setUser(null);
        }
      } finally {
        if (requestId === profileRequestId.current) {
          setIsInitialized(true);
        }
      }
    }

    void bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitialized,
      login,
      logout,
      hasPermission,
    }),
    [hasPermission, isInitialized, login, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthContextProvider');
  }

  return context;
}
