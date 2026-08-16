'use client';

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({
  error,
  reset,
}: DashboardErrorProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">
          Не удалось загрузить раздел
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Произошла ошибка при отображении страницы CRM.
        </p>
        {error.message ? (
          <p className="mt-3 rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Повторить попытку
        </button>
      </div>
    </div>
  );
}
