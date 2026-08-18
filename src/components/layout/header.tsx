'use client';

import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { enumLabel, roleLabels } from '../../lib/labels';
import { NotificationCenter } from '../notifications/notification-center';

const sectionTitles: Record<string, string> = {
  '/tasks': 'Задачи',
  '/leads': 'Лиды',
  '/deals': 'Сделки',
  '/clients': 'Клиенты и Контакты',
  '/orders': 'Заказы',
  '/products': 'Склад',
  '/receipts': 'Ожидаемые приходы',
  '/references': 'Справочники',
  '/reports': 'Отчеты и KPI',
  '/users': 'Команда и Доступы',
};

type HeaderProps = {
  onMenuOpen: () => void;
};

export function Header({ onMenuOpen }: HeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const title = getSectionTitle(pathname);

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuOpen}
          className="rounded p-1 text-slate-600 hover:bg-slate-100 lg:hidden"
          title="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="text-xs text-slate-500">CRM HPL</div>
          <h1 className="truncate text-sm font-semibold text-slate-950">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationCenter />
        {user ? (
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-slate-900">
                {user.firstName} {user.lastName}
              </div>
              <div className="flex justify-end gap-1">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    {enumLabel(roleLabels, role)}
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
