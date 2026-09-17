'use client';

import { useI18n } from '@/i18n/provider';

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({
  error,
  reset,
}: DashboardErrorProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded border border-red-200 bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">
          {t('appError.title')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('appError.description')}
        </p>
        {error.message ? (
          <p className="mt-3 rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {t('common.retryAttempt')}
        </button>
      </div>
    </div>
  );
}
