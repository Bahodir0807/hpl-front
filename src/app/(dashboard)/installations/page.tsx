'use client';

import { Suspense } from 'react';
import { InstallationJobsPage } from '@/components/installations/installation-jobs-page';

export default function InstallationsRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Загрузка монтажных работ...
        </div>
      }
    >
      <InstallationJobsPage />
    </Suspense>
  );
}
