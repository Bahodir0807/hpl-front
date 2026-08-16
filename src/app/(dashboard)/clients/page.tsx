"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CreateClientModal } from "../../../components/clients/create-client-modal";
import { Pagination } from "../../../components/ui/pagination";
import { SearchCombobox } from "../../../components/ui/search-combobox";
import {
  Client,
  ClientSegment,
  ClientType,
  useClients,
} from "../../../hooks/use-clients";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import { useUsersList } from "../../../hooks/use-users";
import { formatDate } from "../../../lib/format";
import { resolveUserName } from "../../../lib/display-names";
import {
  clientSegmentLabels,
  clientStatusLabels,
  clientTypeLabels,
  enumLabel,
} from "../../../lib/labels";

const ClientDetailsModal = dynamic(
  () =>
    import("@/components/clients/client-details-modal").then(
      (m) => m.ClientDetailsModal,
    ),
  { ssr: false },
);

type TypeFilter = "ALL" | ClientType;
type SegmentFilter = "ALL" | ClientSegment;

const typeOptions: { value: TypeFilter; label: string }[] = [
  { value: "ALL", label: "Все типы" },
  { value: "COMPANY", label: clientTypeLabels.COMPANY },
  { value: "INDIVIDUAL", label: clientTypeLabels.INDIVIDUAL },
];

const segmentOptions: { value: SegmentFilter; label: string }[] = [
  { value: "ALL", label: "Все сегменты" },
  { value: "DEALER", label: clientSegmentLabels.DEALER },
  { value: "ARCHITECT", label: clientSegmentLabels.ARCHITECT },
  { value: "CONTRACTOR", label: clientSegmentLabels.CONTRACTOR },
  { value: "END_CUSTOMER", label: clientSegmentLabels.END_CUSTOMER },
  { value: "OTHER", label: clientSegmentLabels.OTHER },
];

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
  const debouncedSearch = useDebouncedValue(search, 450);
  const debouncedOwnerId = useDebouncedValue(ownerId, 450);
  const apiFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      segment: segment === "ALL" ? undefined : segment,
      ownerId: debouncedOwnerId.trim() || undefined,
      page,
      limit: 20,
    }),
    [debouncedOwnerId, debouncedSearch, page, segment],
  );
  const clientsQuery = useClients(apiFilters);
  const { users, usersById } = useUsersList();
  const managerOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user.id,
        label: `${user.firstName} ${user.lastName}`.trim() || user.email,
        description: user.email,
      })),
    [users],
  );
  const clients = useMemo(
    () =>
      (clientsQuery.data?.items ?? []).filter((client) =>
        type === "ALL" ? true : client.type === type,
      ),
    [clientsQuery.data?.items, type],
  );
  const total = clientsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

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
            <SearchCombobox
              value={ownerId}
              onChange={(value) => {
                setOwnerId(value);
                setPage(1);
              }}
              options={managerOptions}
              placeholder="Все менеджеры"
              searchPlaceholder="Поиск сотрудника"
              emptyLabel="Сотрудники не найдены"
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
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
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
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-slate-950 hover:underline"
                      >
                        {client.name}
                      </Link>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {enumLabel(clientTypeLabels, client.type)} ·{" "}
                        {enumLabel(clientStatusLabels, client.status)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {client.inn ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {client.segment
                        ? enumLabel(clientSegmentLabels, client.segment)
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {client.region ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {resolveUserName(client.owner, client.ownerId, usersById)}
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

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
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
