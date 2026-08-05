"use client";

import { useMemo, useState } from "react";
import { ClientDetailsModal } from "../../../components/clients/client-details-modal";
import { CreateClientModal } from "../../../components/clients/create-client-modal";
import {
  Client,
  ClientSegment,
  ClientType,
  useClients,
} from "../../../hooks/use-clients";

type TypeFilter = "ALL" | ClientType;
type SegmentFilter = "ALL" | ClientSegment;

const typeOptions: { value: TypeFilter; label: string }[] = [
  { value: "ALL", label: "Все типы" },
  { value: "COMPANY", label: "COMPANY" },
  { value: "INDIVIDUAL", label: "INDIVIDUAL" },
];

const segmentOptions: { value: SegmentFilter; label: string }[] = [
  { value: "ALL", label: "Все сегменты" },
  { value: "DEALER", label: "DEALER" },
  { value: "ARCHITECT", label: "ARCHITECT" },
  { value: "CONTRACTOR", label: "CONTRACTOR" },
  { value: "END_CUSTOMER", label: "END_CUSTOMER" },
  { value: "OTHER", label: "OTHER" },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getActiveObjectsCount(client: Client): string {
  if (!client.projectObjects) {
    return "-";
  }

  return String(
    client.projectObjects.filter((object) => object.stage !== "ARCHIVED")
      .length,
  );
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [segment, setSegment] = useState<SegmentFilter>("ALL");
  const [ownerId, setOwnerId] = useState("");
  const [page, setPage] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const apiFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      segment: segment === "ALL" ? undefined : segment,
      ownerId: ownerId.trim() || undefined,
      page,
      limit: 20,
    }),
    [ownerId, page, search, segment],
  );
  const clientsQuery = useClients(apiFilters);
  const clients = useMemo(
    () =>
      (clientsQuery.data?.items ?? []).filter((client) =>
        type === "ALL" ? true : client.type === type,
      ),
    [clientsQuery.data?.items, type],
  );
  const total = clientsQuery.data?.total ?? 0;
  const canGoBack = page > 1;
  const canGoForward = page * 20 < total;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Клиенты и контакты
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Реестр клиентов, контактов и объектов строительства.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            Добавить клиента
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded border border-slate-200 bg-white px-3 py-3 lg:grid-cols-[minmax(220px,1fr)_180px_190px_260px]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Поиск
            </span>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Название, ИНН, телефон"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Тип
            </span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as TypeFilter)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Сегмент
            </span>
            <select
              value={segment}
              onChange={(event) => {
                setSegment(event.target.value as SegmentFilter);
                setPage(1);
              }}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              {segmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Менеджер
            </span>
            <input
              value={ownerId}
              onChange={(event) => {
                setOwnerId(event.target.value);
                setPage(1);
              }}
              placeholder="UUID менеджера"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
          </label>
        </div>

        {clientsQuery.isLoading ? (
          <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Загрузка клиентов...
          </div>
        ) : null}

        {clientsQuery.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Не удалось загрузить клиентов.
          </div>
        ) : null}

        {!clientsQuery.isLoading && !clientsQuery.isError ? (
          <div className="overflow-hidden rounded border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Название
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    ИНН
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Сегмент
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Регион
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Ответственный
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Активные объекты
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Создан
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clients.map((client) => (
                  <tr key={client.id} className="align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-950">
                        {client.name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {client.type} · {client.status}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {client.inn ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {client.segment ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {client.region ?? "-"}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs text-slate-700">
                        {client.ownerId}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {getActiveObjectsCount(client)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatDate(client.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedClientId(client.id)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Открыть
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {clients.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-600">
                Клиенты не найдены.
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>
            Страница {page}, всего записей: {total}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!canGoBack}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 disabled:text-slate-400"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={!canGoForward}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 disabled:text-slate-400"
            >
              Далее
            </button>
          </div>
        </div>
      </div>

      <CreateClientModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <ClientDetailsModal
        clientId={selectedClientId}
        onClose={() => setSelectedClientId(null)}
      />
    </>
  );
}
