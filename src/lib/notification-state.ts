import type { Notification } from '@/types/hpl';

export type NotificationListFilters = {
  page?: number;
  limit?: number;
};

export function notificationScopeKey(userId: string | undefined) {
  return ['notifications', userId] as const;
}

export function notificationListKey(
  userId: string | undefined,
  filters: NotificationListFilters,
) {
  return [...notificationScopeKey(userId), filters] as const;
}

export function updateNotificationPage<TPage extends { items: Notification[] }>(
  current: TPage | undefined,
  updated: Notification,
): TPage | undefined {
  if (!current) {
    return current;
  }

  return {
    ...current,
    items: current.items.map((notification) =>
      notification.id === updated.id ? updated : notification,
    ),
  };
}

export function hasUnreadInRecentPage(
  notifications: Notification[],
): boolean {
  return notifications.some((notification) => !notification.isRead);
}

export function shouldMarkNotificationRead(
  notification: Notification,
): boolean {
  return !notification.isRead;
}
