'use client';

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/backend',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const AUTH_ENDPOINTS_SKIP_REFRESH = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
];

const isAuthEndpoint = (url: string | undefined): boolean => {
  if (!url) {
    return false;
  }

  const path = url.split('?')[0];

  return AUTH_ENDPOINTS_SKIP_REFRESH.some(
    (skipPath) => path === skipPath || path.endsWith(skipPath),
  );
};

const isOnLoginPage = (): boolean =>
  typeof window !== 'undefined' && window.location.pathname === '/login';

const redirectToLogin = (): void => {
  if (!isOnLoginPage()) {
    window.location.assign('/login');
  }
};

// Single-flight: параллельные 401 ждут один и тот же refresh-запрос.
let refreshPromise: Promise<void> | null = null;
let logoutPromise: Promise<void> | null = null;

// Защита от петли: каждый запрос повторяется после refresh не более одного раза.
const retriedRequests = new WeakSet<InternalAxiosRequestConfig>();

async function refreshSession(): Promise<void> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Session refresh failed');
  }
}

async function clearClientSession(): Promise<void> {
  logoutPromise ??= fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      logoutPromise = null;
    });

  await logoutPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config;

    if (
      status !== 401 ||
      !originalRequest ||
      isAuthEndpoint(originalRequest.url) ||
      retriedRequests.has(originalRequest)
    ) {
      return Promise.reject(error);
    }

    retriedRequests.add(originalRequest);

    try {
      refreshPromise ??= refreshSession().finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;

      return apiClient(originalRequest);
    } catch (refreshError) {
      if (!isOnLoginPage()) {
        await clearClientSession();
        redirectToLogin();
      }
      return Promise.reject(refreshError);
    }
  },
);
