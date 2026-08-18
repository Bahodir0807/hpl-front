'use client';

import { Bell, ExternalLink, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/use-notifications';
import { formatDateTime } from '@/lib/format';
import {
  hasUnreadInRecentPage,
  shouldMarkNotificationRead,
} from '@/lib/notification-state';
import type { Notification } from '@/types/hpl';

const RECENT_NOTIFICATIONS_LIMIT = 20;

export function NotificationCenter() {
  const router = useRouter();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const notificationsQuery = useNotifications(user?.id, {
    page: 1,
    limit: RECENT_NOTIFICATIONS_LIMIT,
  });
  const markRead = useMarkNotificationRead(user?.id);
  const notifications = notificationsQuery.data?.items ?? [];
  const hasRecentUnread = hasUnreadInRecentPage(notifications);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const openPanel = (): void => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen && !notificationsQuery.isFetching) {
      void notificationsQuery.refetch();
    }
  };

  const handleNotification = async (
    notification: Notification,
  ): Promise<void> => {
    const destination = getNotificationRoute(notification);

    if (shouldMarkNotificationRead(notification)) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        return;
      }
    }

    if (destination) {
      setIsOpen(false);
      router.push(destination);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={openPanel}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
        aria-label={
          hasRecentUnread
            ? 'Уведомления, среди последних есть непрочитанные'
            : 'Уведомления'
        }
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {hasRecentUnread ? (
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
            aria-hidden="true"
          />
        ) : null}
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] border border-slate-200 bg-white shadow-xl"
          role="dialog"
          aria-label="Уведомления"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Уведомления
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Последние {RECENT_NOTIFICATIONS_LIMIT}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
              aria-label="Закрыть уведомления"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {notificationsQuery.isFetching && !notificationsQuery.isLoading ? (
            <div className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
              Обновление...
            </div>
          ) : null}

          {notificationsQuery.isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-600">
              Загрузка уведомлений...
            </div>
          ) : null}

          {notificationsQuery.isError ? (
            <div className="space-y-3 px-4 py-6 text-center">
              <p className="text-sm text-red-700">
                Не удалось загрузить уведомления.
              </p>
              <button
                type="button"
                onClick={() => void notificationsQuery.refetch()}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Повторить
              </button>
            </div>
          ) : null}

          {!notificationsQuery.isLoading &&
          !notificationsQuery.isError &&
          notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-900">
                Пока нет уведомлений
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Новые события появятся здесь.
              </p>
            </div>
          ) : null}

          {!notificationsQuery.isLoading &&
          !notificationsQuery.isError &&
          notifications.length > 0 ? (
            <div className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
              {notifications.map((notification) => {
                const destination = getNotificationRoute(notification);
                const canInteract = !notification.isRead || Boolean(destination);

                return (
                  <button
                    key={notification.id}
                    type="button"
                    disabled={!canInteract || markRead.isPending}
                    onClick={() => void handleNotification(notification)}
                    className={`block w-full px-4 py-3 text-left disabled:cursor-default ${
                      notification.isRead
                        ? `bg-white ${canInteract ? 'hover:bg-slate-50' : ''}`
                        : 'bg-blue-50/60 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 flex h-2 w-2 shrink-0">
                        {!notification.isRead ? (
                          <span className="h-2 w-2 rounded-full bg-blue-600" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-slate-950">
                            {notification.title}
                          </span>
                          {destination ? (
                            <ExternalLink
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                              aria-hidden="true"
                            />
                          ) : null}
                        </span>
                        {notification.message ? (
                          <span className="mt-1 block text-xs leading-5 text-slate-600">
                            {notification.message}
                          </span>
                        ) : null}
                        <span className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{formatDateTime(notification.createdAt)}</span>
                          {!notification.isRead ? (
                            <span className="font-medium text-blue-700">
                              Новое
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {notificationsQuery.data &&
          notificationsQuery.data.total > RECENT_NOTIFICATIONS_LIMIT ? (
            <div className="border-t border-slate-200 px-4 py-2 text-center text-xs text-slate-500">
              Показаны последние {RECENT_NOTIFICATIONS_LIMIT} из{' '}
              {notificationsQuery.data.total}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getNotificationRoute(notification: Notification): string | null {
  if (!notification.relatedId) {
    return notification.taskId ? '/tasks' : null;
  }

  switch (notification.relatedType) {
    case 'Lead':
      return `/leads/${notification.relatedId}`;
    case 'Client':
      return `/clients/${notification.relatedId}`;
    case 'Deal':
      return '/deals';
    case 'Order':
      return '/orders';
    default:
      return notification.taskId ? '/tasks' : null;
  }
}
