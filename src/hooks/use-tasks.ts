"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type TaskComputedStatus =
  "ON_TIME" | "WARNING" | "TODAY" | "OVERDUE" | "CRITICAL_OVERDUE" | "BLOCKED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TaskType =
  | "FIRST_CONTACT"
  | "CALL"
  | "MESSAGE"
  | "EMAIL"
  | "MEETING"
  | "SAMPLE_SEND"
  | "CALCULATION"
  | "OFFER"
  | "PAYMENT_CHECK"
  | "SHIPMENT_CHECK"
  | "OTHER";

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  computedStatus: TaskComputedStatus;
  dueDate: string;
  originalDueDate: string;
  result?: string | null;
  completedAt?: string | null;
  rescheduleCount: number;
  assigneeId: string;
  createdById: string;
  relatedType: string;
  relatedId: string;
  createdAt: string;
  updatedAt: string;
};

export type TasksFilter = {
  assigneeId?: string;
  status?: TaskStatus;
  computedStatus?: TaskComputedStatus;
  relatedType?: string;
  relatedId?: string;
};

export type TasksListResponse = {
  items: Task[];
  total: number;
  page: number;
  limit: number;
};

export type CompleteTaskPayload = {
  id: string;
  result: string;
};

export type RescheduleTaskPayload = {
  id: string;
  newDueDate: string;
  reason: string;
};

export type CreateTaskPayload = {
  title: string;
  description?: string;
  type: TaskType;
  priority?: TaskPriority;
  dueDate: string;
  assigneeId: string;
  relatedType: string;
  relatedId: string;
};

export function useTasks(filters: TasksFilter) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: async (): Promise<TasksListResponse> => {
      const response = await apiClient.get<TasksListResponse>("/tasks", {
        params: filters,
      });

      return response.data;
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CompleteTaskPayload): Promise<Task> => {
      const response = await apiClient.patch<Task>(
        `/tasks/${payload.id}/complete`,
        {
          result: payload.result,
        },
      );

      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useRescheduleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RescheduleTaskPayload): Promise<Task> => {
      const response = await apiClient.post<Task>(
        `/tasks/${payload.id}/reschedule`,
        {
          newDueDate: payload.newDueDate,
          reason: payload.reason,
        },
      );

      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTaskPayload): Promise<Task> => {
      const response = await apiClient.post<Task>("/tasks", payload);

      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
