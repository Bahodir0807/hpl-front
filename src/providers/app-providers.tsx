'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { ReactNode, useState } from 'react';
import { Toaster } from 'sonner';
import { useTheme } from 'next-themes';
import { AuthContextProvider } from '../context/auth-context';
import { I18nProvider } from '@/i18n/provider';
import { AppThemeProvider } from '@/theme/app-theme-provider';
import type { Locale, ThemeName } from '@/i18n/config';

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;

  if (status === 401 || status === 403 || status === 429) {
    return false;
  }

  return failureCount < 1;
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
    />
  );
}

export function AppProviders({
  children,
  initialLocale,
  initialTheme,
}: {
  children: ReactNode;
  initialLocale: Locale;
  initialTheme: ThemeName;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: shouldRetryQuery,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider initialTheme={initialTheme}>
        <I18nProvider initialLocale={initialLocale}>
          <AuthContextProvider>
            {children}
            <ThemedToaster />
          </AuthContextProvider>
        </I18nProvider>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}
