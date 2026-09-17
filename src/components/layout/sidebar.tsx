'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useI18n } from '@/i18n/provider';

type NavigationItem = {
  href: string;
  labelKey:
    | 'overview'
    | 'leads'
    | 'deals'
    | 'installation'
    | 'clients'
    | 'tasks'
    | 'panels'
    | 'suppliers'
    | 'warehouse'
    | 'orders'
    | 'receipts'
    | 'reports'
    | 'users';
  permission?: string;
  anyOf?: string[];
};

type NavigationGroup = {
  titleKey: 'sales' | 'references' | 'warehouse' | 'analytics';
  items: NavigationItem[];
};

const navigationGroups: NavigationGroup[] = [
  {
    titleKey: 'sales',
    items: [
      { href: '/', labelKey: 'overview' },
      { href: '/leads', labelKey: 'leads', permission: 'leads:read' },
      { href: '/deals', labelKey: 'deals', permission: 'deals:read' },
      {
        href: '/installations',
        labelKey: 'installation',
        anyOf: [
          'installation:schedule',
          'installation:confirm_supervisor',
          'installation:assess',
        ],
      },
      { href: '/clients', labelKey: 'clients', permission: 'clients:read' },
      { href: '/tasks', labelKey: 'tasks', permission: 'tasks:read' },
    ],
  },
  {
    titleKey: 'references',
    items: [
      { href: '/references/panels', labelKey: 'panels', permission: 'panel_catalog:read' },
      { href: '/references/panels#suppliers', labelKey: 'suppliers', permission: 'panel_catalog:read' },
    ],
  },
  {
    titleKey: 'warehouse',
    items: [
      { href: '/products', labelKey: 'warehouse', permission: 'products:read' },
      { href: '/orders', labelKey: 'orders', permission: 'orders:read' },
      { href: '/receipts', labelKey: 'receipts', permission: 'inventory:read' },
    ],
  },
  {
    titleKey: 'analytics',
    items: [
      { href: '/reports', labelKey: 'reports', permission: 'reports:read' },
      {
        href: '/users',
        labelKey: 'users',
        permission: 'users:read',
      },
    ],
  },
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useI18n();
  const visibleGroups = getVisibleNavigationGroups(user?.permissions ?? []);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-slate-200 bg-white transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
        <div className="text-sm font-semibold tracking-wide text-slate-950">
          {t('common.brand')}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-600 hover:bg-slate-100 lg:hidden"
          title={t('common.closeMenu')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="space-y-5 px-3 py-4">
        {visibleGroups.map((group) => (
          <div key={group.titleKey}>
            <div className="px-2 pb-2 text-xs font-semibold uppercase text-slate-500">
              {t(`navigation.groups.${group.titleKey}`)}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={getItemClassName(pathname, item.href)}
                  >
                    {t(`navigation.${item.labelKey}`)}
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function getVisibleNavigationGroups(
  permissions: string[],
): NavigationGroup[] {
  const permissionSet = new Set(permissions);

  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.permission && permissionSet.has(item.permission)) {
          return true;
        }
        if (item.anyOf?.some((permission) => permissionSet.has(permission))) {
          return true;
        }
        return !item.permission && !item.anyOf;
      }),
    }))
    .filter((group) => group.items.length > 0);
}

function getItemClassName(pathname: string, href: string): string {
  const itemPath = href.split('#')[0];
  const isActive =
    pathname === itemPath ||
    (itemPath !== '/references/panels' && pathname.startsWith(`${itemPath}/`)) ||
    (itemPath === '/references/panels' && pathname.startsWith('/references/'));
  const baseClassName =
    'block rounded px-2 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-950';

  return isActive
    ? `${baseClassName} bg-slate-100 font-semibold text-slate-900`
    : baseClassName;
}
