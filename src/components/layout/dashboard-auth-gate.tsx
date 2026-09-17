'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useI18n } from '@/i18n/provider';

type DashboardAuthGateProps = {
  children: ReactNode;
};

export function DashboardAuthGate({ children }: DashboardAuthGateProps) {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, router, user]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
          aria-label={t('common.loading')}
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}
