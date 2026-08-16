'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { ReactNode, useState } from 'react';
import { Toaster } from 'sonner';
import { AuthContextProvider } from '../context/auth-context';

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;

  if (status === 401 || status === 403 || status === 429) {
    return false;
  }

  return failureCount < 1;
}

export function AppProviders({ children }: { children: ReactNode }) {
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
      <AuthContextProvider>
        {children}
        <Toaster position="top-right" richColors closeButton duration={4000} />
      </AuthContextProvider>
    </QueryClientProvider>
  );
}
