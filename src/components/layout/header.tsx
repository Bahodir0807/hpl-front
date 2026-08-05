'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';

const sectionTitles: Record<string, string> = {
  '/tasks': 'Мой день',
  '/leads': 'Лиды',
  '/deals': 'Сделки',
  '/clients': 'Клиенты и Контакты',
  '/orders': 'Заказы',
  '/products': 'Каталог HPL и Остатки',
  '/receipts': 'Ожидаемые приходы',
  '/reports': 'Отчеты и KPI',
  '/users': 'Команда и Доступы',
};

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const title = getSectionTitle(pathname);

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <div className="text-xs text-slate-500">CRM HPL</div>
        <h1 className="text-sm font-semibold text-slate-950">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900">
                {user.firstName} {user.lastName}
              </div>
              <div className="flex justify-end gap-1">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={logout}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Выйти
        </button>
      </div>
    </header>
  );
}

function getSectionTitle(pathname: string): string {
  const matchedPath = Object.keys(sectionTitles)
    .sort((left, right) => right.length - left.length)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`));

  return matchedPath ? sectionTitles[matchedPath] : 'Рабочий раздел';
}
