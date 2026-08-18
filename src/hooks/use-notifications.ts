'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { showError } from '../lib/toast';
import type { Notification } from '../types/hpl';

export type NotificationsFilter = {
  page?: number;
  limit?: number;
};

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
    queryKey: ['notifications', userId, filters],
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
        { queryKey: ['notifications', userId] },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((notification) =>
                  notification.id === updatedNotification.id
                    ? updatedNotification
                    : notification,
                ),
              }
            : current,
      );
      void queryClient.invalidateQueries({
        queryKey: ['notifications', userId],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
