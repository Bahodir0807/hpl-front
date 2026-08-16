"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { getErrorMessage } from "../lib/errors";
import { showError, showSuccess } from "../lib/toast";
import { Deal, DealStage } from "./use-deals";

export type ClientType = "COMPANY" | "INDIVIDUAL";
export type ClientStatus = "ACTIVE" | "ARCHIVED" | "BLACKLISTED";
export type ClientSegment =
  "DEALER" | "ARCHITECT" | "CONTRACTOR" | "END_CUSTOMER" | "OTHER";

export type Contact = {
  id: string;
  clientId: string;
  firstName: string;
  lastName?: string | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectObject = {
  id: string;
  clientId: string;
  name: string;
  address?: string | null;
  type?: string | null;
  stage?: string | null;
  approximateArea?: number | string | null;
  expectedDate?: string | null;
  decisionMakerContactId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientLead = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

export type ClientOwner = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
};

export type Client = {
  id: string;
  type: ClientType;
  name: string;
  inn?: string | null;
  phone?: string | null;
  email?: string | null;
  status: ClientStatus;
  segment?: ClientSegment | null;
  region?: string | null;
  address?: string | null;
  source?: string | null;
  comment?: string | null;
  ownerId: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: ClientOwner | null;
  contacts?: Contact[];
  projectObjects?: ProjectObject[];
  deals?: Deal[];
  leads?: ClientLead[];
};

export type ClientsFilter = {
  search?: string;
  status?: ClientStatus;
  segment?: ClientSegment;
  region?: string;
  ownerId?: string;
  page?: number;
  limit?: number;
};

export type ClientsListResponse = {
  items: Client[];
  total: number;
  page: number;
  limit: number;
};

export type DuplicateClient = {
  id: string;
  type: ClientType;
  name: string;
  inn?: string | null;
  phone?: string | null;
  email?: string | null;
  ownerId: string;
  status: ClientStatus;
};

export type ClientDuplicateMatch = {
  client: DuplicateClient;
  reasons: string[];
};

export type CreateContactPayload = {
  firstName: string;
  lastName?: string;
  position?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
};

export type CreateClientPayload = {
  type: ClientType;
  name: string;
  inn?: string;
  phone?: string;
  email?: string;
  status?: ClientStatus;
  segment?: ClientSegment;
  region?: string;
  address?: string;
  source?: string;
  comment?: string;
  contacts?: CreateContactPayload[];
};

export type AddContactPayload = CreateContactPayload & {
  clientId: string;
};

export type AddProjectObjectPayload = {
  clientId: string;
  name: string;
  address?: string;
  type?: string;
  stage?: string;
  approximateArea?: number;
  expectedDate?: string;
  decisionMakerContactId?: string;
};

export type ActivityTimelineItem = {
  id: string;
  authorId: string;
  relatedType: string;
  relatedId: string;
  type: string;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export function useClients(filters: ClientsFilter) {
  return useQuery({
    queryKey: ["clients", filters],
    queryFn: async (): Promise<ClientsListResponse> => {
      const response = await apiClient.get<ClientsListResponse>("/clients", {
        params: filters,
      });

      return response.data;
    },
  });
}

export function useClient(id: string | null) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async (): Promise<Client> => {
      const response = await apiClient.get<Client>(`/clients/${id}`);

      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useCheckClientDuplicates(input: {
  inn?: string;
  phone?: string;
  email?: string;
  name?: string;
}) {
  const normalizedInput = {
    inn: input.inn?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    name: input.name?.trim() || undefined,
  };
  const enabled = Boolean(
    normalizedInput.inn || normalizedInput.phone || normalizedInput.email,
  );

  return useQuery({
    queryKey: ["client-duplicates", normalizedInput],
    queryFn: async (): Promise<ClientDuplicateMatch[]> => {
      const response = await apiClient.post<ClientDuplicateMatch[]>(
        "/clients/check-duplicates",
        normalizedInput,
      );

      return response.data;
    },
    enabled,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateClientPayload): Promise<Client> => {
      const response = await apiClient.post<Client>("/clients", payload);

      return response.data;
    },
    onSuccess: () => {
      showSuccess("Клиент создан");
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useAddContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddContactPayload): Promise<Contact> => {
      const { clientId, ...body } = payload;
      const response = await apiClient.post<Contact>(
        `/clients/${clientId}/contacts`,
        body,
      );

      return response.data;
    },
    onSuccess: (_contact, payload) => {
      showSuccess("Контакт добавлен");
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
      void queryClient.invalidateQueries({
        queryKey: ["clients", payload.clientId],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useAddProjectObject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: AddProjectObjectPayload,
    ): Promise<ProjectObject> => {
      const { clientId, ...body } = payload;
      const response = await apiClient.post<ProjectObject>(
        `/clients/${clientId}/objects`,
        body,
      );

      return response.data;
    },
    onSuccess: (_object, payload) => {
      showSuccess("Объект добавлен");
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
      void queryClient.invalidateQueries({
        queryKey: ["clients", payload.clientId],
      });
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });
}

export function useClientTimeline(clientId: string | null) {
  const clientQuery = useClient(clientId);
  const leadIds = (clientQuery.data?.leads ?? []).map((lead) => lead.id);
  const dealIds = (clientQuery.data?.deals ?? []).map((deal) => deal.id);

  return useQuery({
    queryKey: ["client-timeline", clientId, leadIds, dealIds],
    queryFn: async (): Promise<ActivityTimelineItem[]> => {
      const requests = [
        ...leadIds.map((id) =>
          apiClient.get<ActivityTimelineItem[]>(`/audit/timeline/Lead/${id}`),
        ),
        ...dealIds.map((id) =>
          apiClient.get<ActivityTimelineItem[]>(`/audit/timeline/Deal/${id}`),
        ),
      ];

      if (requests.length === 0) {
        return [];
      }

      const responses = await Promise.all(requests);

      return responses
        .flatMap((response) => response.data)
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        );
    },
    enabled: Boolean(clientId) && clientQuery.isSuccess,
  });
}

export type ClientDealSummary = Pick<
  Deal,
  "id" | "title" | "stage" | "totalAmount" | "nextActionAt"
> & {
  stage: DealStage;
};
