import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-4xl font-bold text-slate-950">404</h1>
        <p className="mt-3 text-sm text-slate-600">
          Запрашиваемая страница CRM не найдена
        </p>
        <Link
          href="/leads"
          className="mt-5 inline-flex rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Перейти к лидам
        </Link>
      </div>
    </div>
  );
}
