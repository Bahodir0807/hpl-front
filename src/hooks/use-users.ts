"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { getErrorMessage } from "../lib/errors";
import { showError, showSuccess } from "../lib/toast";

export type RoleName =
  | 'ADMIN'
  | 'DIRECTOR'
  | 'HEAD'
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'STOREKEEPER'
  | 'INSTALLER';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  teamId?: string | null;
  managerId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roles?: { role?: { name: RoleName } }[];
};

export type UsersListResponse =
  | {
      items: User[];
      total: number;
    }
  | User[];

export type UsersFilter = {
  page?: number;
  limit?: number;
  search?: string;
  role?: RoleName;
};

export type CreateUserPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  teamId?: string;
  managerId?: string;
  roleNames: RoleName[];
};

export type UpdateUserPayload = {
  id: string;
  isActive: boolean;
};

export function normalizeUsersList(data?: UsersListResponse): User[] {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data.items) ? data.items : [];
}

export function useUsers(enabled = true, filters: UsersFilter = {}) {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: async (): Promise<UsersListResponse> => {
      const response = await apiClient.get<UsersListResponse>("/users", {
        params: filters,
      });

      return response.data;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUsersList(enabled = true, filters: UsersFilter = {}) {
  const query = useUsers(enabled, filters);
  const users = useMemo(() => normalizeUsersList(query.data), [query.data]);
  const usersById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  return {
    ...query,
    users,
    usersById,
  };
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateUserPayload): Promise<User> => {
      const response = await apiClient.post<User>("/users", payload);

      return response.data;
    },
    onSuccess: () => {
      showSuccess("Сотрудник создан");
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateUserPayload): Promise<User> => {
      const response = await apiClient.patch<User>(
        `/users/${payload.id}/status`,
        {
          isActive: payload.isActive,
        },
      );

      return response.data;
    },
    onSuccess: (updatedUser) => {
      showSuccess(
        updatedUser.isActive
          ? "Доступ сотрудника активирован"
          : "Доступ сотрудника заблокирован",
      );
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}
