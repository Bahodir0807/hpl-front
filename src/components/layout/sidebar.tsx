'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';

type NavigationItem = {
  href: string;
  label: string;
  permission?: string;
};

type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

const navigationGroups: NavigationGroup[] = [
  {
    title: 'Рабочий стол',
    items: [{ href: '/tasks', label: 'Мой день (Задачи)' }],
  },
  {
    title: 'Продажи',
    items: [
      { href: '/leads', label: 'Лиды' },
      { href: '/deals', label: 'Сделки' },
      { href: '/clients', label: 'Клиенты и Контакты' },
    ],
  },
  {
    title: 'Операции и Склад',
    items: [
      { href: '/orders', label: 'Заказы' },
      { href: '/products', label: 'Каталог HPL и Остатки' },
      { href: '/receipts', label: 'Ожидаемые приходы' },
    ],
  },
  {
    title: 'Аналитика и Настройки',
    items: [
      { href: '/reports', label: 'Отчеты и KPI' },
      {
        href: '/users',
        label: 'Команда и Доступы',
        permission: 'users:read',
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 w-60 border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <div className="text-sm font-semibold tracking-wide text-slate-950">
          HPL CRM MVP
        </div>
      </div>

      <nav className="space-y-5 px-3 py-4">
        {navigationGroups.map((group) => (
          <div key={group.title}>
            <div className="px-2 pb-2 text-xs font-semibold uppercase text-slate-500">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items
                .filter((item) =>
                  item.permission ? hasPermission(item.permission) : true,
                )
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={getItemClassName(pathname, item.href)}
                  >
                    {item.label}
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function getItemClassName(pathname: string, href: string): string {
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const baseClassName =
    'block rounded px-2 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-950';

  return isActive
    ? `${baseClassName} bg-slate-100 font-semibold text-slate-900`
    : baseClassName;
}
