"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Client,
  Contact,
  ProjectObject,
  useAddContact,
  useClient,
  useClientTimeline,
} from "../../hooks/use-clients";
import { AddObjectModal } from "./add-object-modal";

type ClientDetailsModalProps = {
  clientId: string | null;
  onClose: () => void;
};

type TabId = "contacts" | "objects" | "deals" | "timeline";

const tabs: { id: TabId; label: string }[] = [
  { id: "contacts", label: "Контакты" },
  { id: "objects", label: "Объекты" },
  { id: "deals", label: "Сделки" },
  { id: "timeline", label: "История и лента" },
];

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Укажите имя"),
  lastName: z.string().trim().optional(),
  position: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Некорректный email",
    }),
});

type ContactFormValues = z.infer<typeof contactSchema>;

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoney(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function contactName(contact: Contact): string {
  return `${contact.firstName} ${contact.lastName ?? ""}`.trim();
}

function activeObjectsCount(objects?: ProjectObject[]): number {
  return (objects ?? []).filter((object) => object.stage !== "ARCHIVED").length;
}

function HeaderSummary({ client }: { client: Client }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
        Статус: {client.status}
      </span>
      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
        ИНН: {client.inn ?? "-"}
      </span>
      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
        Ответственный: {client.ownerId}
      </span>
      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
        Активные объекты: {activeObjectsCount(client.projectObjects)}
      </span>
    </div>
  );
}

export function ClientDetailsModal({
  clientId,
  onClose,
}: ClientDetailsModalProps) {
  const clientQuery = useClient(clientId);
  const timelineQuery = useClientTimeline(clientId);
  const addContact = useAddContact();
  const [activeTab, setActiveTab] = useState<TabId>("contacts");
  const [isAddObjectOpen, setIsAddObjectOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      position: "",
      phone: "",
      email: "",
    },
  });

  useEffect(() => {
    if (!clientId) {
      reset();
      setActiveTab("contacts");
      setIsAddObjectOpen(false);
    }
  }, [clientId, reset]);

  if (!clientId) {
    return null;
  }

  const client = clientQuery.data;

  const submitContact = async (values: ContactFormValues): Promise<void> => {
    await addContact.mutateAsync({
      clientId,
      firstName: values.firstName,
      lastName: values.lastName || undefined,
      position: values.position || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
    });

    reset();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-950">
                {client?.name ?? "Клиент"}
              </h2>
              <div className="mt-1 text-sm text-slate-600">
                {client?.type ?? "-"} · {client?.segment ?? "без сегмента"} ·{" "}
                {client?.region ?? "регион не указан"}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href={client ? `/leads?clientId=${client.id}` : "/leads"}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Создать лид
              </Link>
              <Link
                href={client ? `/deals?clientId=${client.id}` : "/deals"}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Создать сделку
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                Закрыть
              </button>
            </div>
          </div>

          {client ? (
            <div className="mt-4">
              <HeaderSummary client={client} />
            </div>
          ) : null}
        </div>

        <div className="border-b border-slate-200 px-5">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-3 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-slate-900 text-slate-950"
                    : "border-transparent text-slate-600 hover:text-slate-950"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          {clientQuery.isLoading ? (
            <div className="text-sm text-slate-600">Загрузка клиента...</div>
          ) : null}

          {clientQuery.isError ? (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Не удалось загрузить клиента.
            </div>
          ) : null}

          {client ? (
            <>
              {activeTab === "contacts" ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            ФИО
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Должность
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Телефон
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            E-mail
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Мессенджер
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(client.contacts ?? []).map((contact) => (
                          <tr key={contact.id}>
                            <td className="px-3 py-2 font-medium text-slate-950">
                              {contactName(contact)}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {contact.position ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {contact.phone ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {contact.email ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-500">-</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <form
                    onSubmit={(event) => {
                      void handleSubmit(submitContact)(event);
                    }}
                    className="rounded border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="mb-3 text-sm font-semibold text-slate-950">
                      Быстро добавить контакт
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                      <input
                        placeholder="Имя"
                        className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                        {...register("firstName")}
                      />
                      <input
                        placeholder="Фамилия"
                        className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                        {...register("lastName")}
                      />
                      <input
                        placeholder="Должность"
                        className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                        {...register("position")}
                      />
                      <input
                        placeholder="Телефон"
                        className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                        {...register("phone")}
                      />
                      <input
                        placeholder="Email"
                        className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                        {...register("email")}
                      />
                    </div>
                    {(errors.firstName ?? errors.email) ? (
                      <div className="mt-2 text-sm text-red-600">
                        {errors.firstName?.message ?? errors.email?.message}
                      </div>
                    ) : null}
                    <div className="mt-3 flex justify-end">
                      <button
                        type="submit"
                        disabled={!isValid || addContact.isPending}
                        className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
                      >
                        Добавить контакт
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {activeTab === "objects" ? (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAddObjectOpen(true)}
                      className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                    >
                      Добавить объект
                    </button>
                  </div>
                  <div className="overflow-hidden rounded border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Название
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Адрес
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Стадия
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Площадь м²
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">
                            Срок
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(client.projectObjects ?? []).map((object) => (
                          <tr key={object.id}>
                            <td className="px-3 py-2 font-medium text-slate-950">
                              {object.name}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {object.address ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {object.stage ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {formatMoney(object.approximateArea)}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {formatDate(object.expectedDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {activeTab === "deals" ? (
                <div className="overflow-hidden rounded border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          Сделка
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          Этап
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          Сумма
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          Следующее действие
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(client.deals ?? []).map((deal) => (
                        <tr key={deal.id}>
                          <td className="px-3 py-2 font-medium text-slate-950">
                            {deal.title}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {deal.stage}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatMoney(deal.totalAmount)}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatDateTime(deal.nextActionAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {activeTab === "timeline" ? (
                <div className="space-y-2">
                  {timelineQuery.isLoading ? (
                    <div className="text-sm text-slate-600">
                      Загрузка ленты...
                    </div>
                  ) : null}
                  {(timelineQuery.data ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="rounded border border-slate-200 bg-white p-3 text-sm"
                    >
                      <div className="font-medium text-slate-950">
                        {item.type}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {formatDateTime(item.createdAt)}
                      </div>
                      {item.content ? (
                        <div className="mt-2 text-slate-700">
                          {item.content}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {!timelineQuery.isLoading &&
                  (timelineQuery.data ?? []).length === 0 ? (
                    <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      Лента активности пуста.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <AddObjectModal
        clientId={clientId}
        isOpen={isAddObjectOpen}
        onClose={() => setIsAddObjectOpen(false)}
      />
    </div>
  );
}
