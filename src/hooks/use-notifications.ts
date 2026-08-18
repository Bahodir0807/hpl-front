'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError } from '../lib/toast';
import {
  NotificationListFilters,
  notificationListKey,
  notificationScopeKey,
  updateNotificationPage,
} from '../lib/notification-state';
import type { Notification } from '../types/hpl';

export type NotificationsFilter = NotificationListFilters;

export type NotificationsListResponse = {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
};

export function useNotifications(
  userId: string | undefined,
  filters: NotificationsFilter,
) {
  return useQuery({
    queryKey: notificationListKey(userId, filters),
    queryFn: async (): Promise<NotificationsListResponse> => {
      const response = await apiClient.get<NotificationsListResponse>(
        '/notifications',
        { params: filters },
      );

      return response.data;
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useMarkNotificationRead(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Notification> => {
      const response = await apiClient.patch<Notification>(
        `/notifications/${id}/read`,
      );

      return response.data;
    },
    onSuccess: (updatedNotification) => {
      queryClient.setQueriesData<NotificationsListResponse>(
        { queryKey: notificationScopeKey(userId) },
        (current) => updateNotificationPage(current, updatedNotification),
      );
      void queryClient.invalidateQueries({
        queryKey: notificationScopeKey(userId),
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
