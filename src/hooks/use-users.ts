"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

export type RoleName =
  "ADMIN" | "HEAD" | "MANAGER" | "STOREKEEPER" | "OBSERVER";

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

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const response = await apiClient.get<User[]>("/users");

      return response.data;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateUserPayload): Promise<User> => {
      const response = await apiClient.post<User>("/users", payload);

      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
