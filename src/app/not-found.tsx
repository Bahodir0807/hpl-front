'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/provider';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t('notFound.title')}</p>
        <Link
          href="/leads"
          className="mt-5 inline-flex rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {t('notFound.toLeads')}
        </Link>
      </div>
    </div>
  );
}
