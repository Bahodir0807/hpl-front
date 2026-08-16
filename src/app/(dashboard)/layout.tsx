import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { DashboardAuthGate } from '@/components/layout/dashboard-auth-gate';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/lib/auth-cookies';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    redirect('/login');
  }

  return (
    <DashboardAuthGate>
      <DashboardShell>{children}</DashboardShell>
    </DashboardAuthGate>
  );
}
