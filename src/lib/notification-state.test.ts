import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { Notification } from '@/types/hpl';
import {
  hasUnreadInRecentPage,
  notificationListKey,
  notificationScopeKey,
  shouldMarkNotificationRead,
  updateNotificationPage,
} from './notification-state';

function notification(
  id: string,
  isRead: boolean,
): Notification {
  return {
    id,
    userId: 'user-1',
    title: `Notification ${id}`,
    type: 'TEST',
    isRead,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('notification state', () => {
  it('updates a matching unread notification in user-scoped cache', () => {
    const queryClient = new QueryClient();
    const filters = { page: 1, limit: 20 };
    const key = notificationListKey('user-1', filters);
    const unread = notification('notification-1', false);
    const updated = { ...unread, isRead: true };
    queryClient.setQueryData(key, {
      items: [unread],
      total: 1,
      page: 1,
      limit: 20,
    });

    queryClient.setQueriesData(
      { queryKey: notificationScopeKey('user-1') },
      (current) =>
        updateNotificationPage(
          current as { items: Notification[] } | undefined,
          updated,
        ),
    );

    const cached = queryClient.getQueryData<{ items: Notification[] }>(key);
    expect(cached?.items[0]?.isRead).toBe(true);
  });

  it('does not update another user cache', () => {
    expect(notificationListKey('user-1', { page: 1 })).not.toEqual(
      notificationListKey('user-2', { page: 1 }),
    );
  });

  it('guards already-read notifications from redundant mark-read work', () => {
    expect(shouldMarkNotificationRead(notification('unread', false))).toBe(true);
    expect(shouldMarkNotificationRead(notification('read', true))).toBe(false);
  });

  it('derives the indicator only from the currently loaded recent page', () => {
    expect(hasUnreadInRecentPage([notification('read', true)])).toBe(false);
    expect(
      hasUnreadInRecentPage([
        notification('read', true),
        notification('unread', false),
      ]),
    ).toBe(true);
  });
});
