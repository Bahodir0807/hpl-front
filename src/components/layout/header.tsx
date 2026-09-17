'use client';

import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { enumLabel } from '../../lib/labels';
import { useI18n } from '@/i18n/provider';
import { useLabelMaps } from '@/i18n/use-label-maps';
import { NotificationCenter } from '../notifications/notification-center';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';

type HeaderProps = {
  onMenuOpen: () => void;
};

export function Header({ onMenuOpen }: HeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { roleLabels } = useLabelMaps();
  const title = getSectionTitle(pathname, t);

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuOpen}
          className="rounded p-1 text-slate-600 hover:bg-slate-100 lg:hidden"
          title={t('common.openMenu')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="text-xs text-slate-500">{t('common.brandShort')}</div>
          <h1 className="truncate text-sm font-semibold text-slate-950">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationCenter />
        <LocaleSwitcher />
        <ThemeToggle />
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
          {t('header.logout')}
        </button>
      </div>
    </header>
  );
}

function getSectionTitle(
  pathname: string,
  t: (key: string) => string,
): string {
  const sectionKeys: Record<string, string> = {
    '/': 'navigation.overview',
    '/tasks': 'navigation.tasks',
    '/leads': 'navigation.leads',
    '/deals': 'navigation.deals',
    '/installations': 'navigation.installation',
    '/clients': 'navigation.clients',
    '/orders': 'navigation.orders',
    '/products': 'navigation.warehouse',
    '/receipts': 'navigation.receipts',
    '/references': 'navigation.references',
    '/reports': 'navigation.reports',
    '/users': 'navigation.users',
  };

  const matchedPath = Object.keys(sectionKeys)
    .sort((left, right) => right.length - left.length)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`));

  return matchedPath ? t(sectionKeys[matchedPath]) : t('common.workingSection');
}
