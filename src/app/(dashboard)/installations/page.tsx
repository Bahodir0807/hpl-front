'use client';

import { Suspense } from 'react';
import { InstallationJobsPage } from '@/components/installations/installation-jobs-page';
import { useI18n } from '@/i18n/provider';

export default function InstallationsRoutePage() {
  const { t } = useI18n();

  return (
    <Suspense
      fallback={
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          {t('installations.loading')}
        </div>
      }
    >
      <InstallationJobsPage />
    </Suspense>
  );
}
