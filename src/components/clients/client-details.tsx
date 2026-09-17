"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, RefreshCcw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "../../context/auth-context";
import {
  Client,
  Contact,
  ProjectObject,
  useAddContact,
  useClient,
  useClientTimeline,
  useUpdateClient,
} from "../../hooks/use-clients";
import { useUsersList, User } from "../../hooks/use-users";
import { formatDate, formatDateTime, formatNumber } from "../../lib/format";
import { formatMoney } from "../../lib/currency";
import { resolveUserName } from "../../lib/display-names";
import { createOptionalPhoneSchema } from "../../lib/validations/phone";
import { buildUpdateClientContactPayload } from "../../lib/client-contact";
import { enumLabel } from "../../lib/labels";
import { useI18n } from "@/i18n/provider";
import type { Messages } from "@/i18n/types";
import { useLabelMaps } from "@/i18n/use-label-maps";
import { AddObjectModal } from "./add-object-modal";
import { ClientDocuments } from "./client-documents";
import { ClientQuotes } from "./client-quotes";

type ClientDetailsProps = {
  clientId: string;
  onClose?: () => void;
};

type TabId =
  | "overview"
  | "contacts"
  | "objects"
  | "leads"
  | "deals"
  | "quotes"
  | "documents"
  | "timeline";

const tabs: TabId[] = [
  "overview",
  "contacts",
  "objects",
  "leads",
  "deals",
  "quotes",
  "documents",
  "timeline",
];

function createContactSchema(messages: Messages) {
  return z.object({
    firstName: z.string().trim().min(1, messages.validation.firstNameRequired),
    lastName: z.string().trim().optional(),
    position: z.string().trim().optional(),
    phone: createOptionalPhoneSchema(messages),
    email: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || z.string().email().safeParse(value).success, {
        message: messages.validation.invalidEmail,
      }),
  });
}

type ContactFormValues = z.infer<ReturnType<typeof createContactSchema>>;

function createClientContactSchema(messages: Messages) {
  return z.object({
    phone: createOptionalPhoneSchema(messages),
    email: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || z.string().email().safeParse(value).success, {
        message: messages.validation.invalidEmail,
      }),
  });
}

type ClientContactFormValues = z.infer<ReturnType<typeof createClientContactSchema>>;

function contactName(contact: Contact): string {
  return `${contact.firstName} ${contact.lastName ?? ""}`.trim();
}

function activeObjectsCount(objects?: ProjectObject[]): number {
  return (objects ?? []).filter((object) => object.stage !== "ARCHIVED").length;
}

function sourceLabel(source: string, websiteLabel: string): string {
  if (source === "telegram") return "Telegram";
  if (source === "website") return websiteLabel;
  return source;
}

function leadStatusClass(status: string): string {
  switch (status) {
    case "NEW":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "IN_PROGRESS":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "QUALIFIED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "CONVERTED":
      return "border-green-200 bg-green-50 text-green-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function HeaderSummary({
  client,
  usersById,
}: {
  client: Client;
  usersById: Map<string, User>;
}) {
  const { t } = useI18n();
  const { clientStatusLabels } = useLabelMaps();
  return (
    <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
        {t("common.status")}: {enumLabel(clientStatusLabels, client.status)}
      </span>
      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
        {t("clients.inn")}: {client.inn ?? t("common.dash")}
      </span>
      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
        {t("clients.owner")}:{" "}
        {resolveUserName(client.owner, client.ownerId, usersById)}
      </span>
      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
        {t("clients.activeObjects")}: {activeObjectsCount(client.projectObjects)}
      </span>
    </div>
  );
}

export function ClientDetails({ clientId, onClose }: ClientDetailsProps) {
  const { t, messages } = useI18n();
  const {
    clientSegmentLabels,
    clientTypeLabels,
    dealStageLabels,
    leadStatusLabels,
  } = useLabelMaps();
  const { user } = useAuth();
  const clientQuery = useClient(clientId);
  const canReadAudit = user?.permissions.includes("audit:read") ?? false;
  const canReadUsers = user?.permissions.includes("users:read") ?? false;
  const timelineQuery = useClientTimeline(clientId, canReadAudit);
  const { usersById } = useUsersList(canReadUsers, { limit: 100 });
  const addContact = useAddContact();
  const canUpdateClient = user?.permissions.includes("clients:update") ?? false;
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isAddObjectOpen, setIsAddObjectOpen] = useState(false);
  const contactSchema = useMemo(
    () => createContactSchema(messages),
    [messages],
  );
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

  const client = clientQuery.data;
  const primaryContact = client?.contacts?.find((contact) => contact.isPrimary);

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 p-5">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-950">
              {client?.name ?? t("clients.fallback")}
            </h2>
            <div className="mt-1 text-sm text-slate-600">
              {client ? enumLabel(clientTypeLabels, client.type) : t("common.dash")} ·{" "}
              {client?.segment
                ? enumLabel(clientSegmentLabels, client.segment)
                : t("clients.noSegment")}{" "}
              · {client?.region ?? t("clients.noRegion")}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
            <Link
              href={client ? `/leads?clientId=${client.id}` : "/leads"}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t("clients.createLead")}
            </Link>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                {t("common.close")}
              </button>
            ) : null}
          </div>
        </div>

        {client ? (
          <div className="mt-4">
            <HeaderSummary client={client} usersById={usersById} />
          </div>
        ) : null}
      </div>

      <div className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-5">
        <div className="flex w-max min-w-full gap-1">
          {tabs.map((tabId) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                activeTab === tabId
                  ? "border-slate-900 text-slate-950"
                  : "border-transparent text-slate-600 hover:text-slate-950"
              }`}
            >
              {t(`clients.tabs.${tabId}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-5">
        {clientQuery.isLoading ? (
          <div className="text-sm text-slate-600">{t("clients.loadingOne")}</div>
        ) : null}

        {clientQuery.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{t("clients.loadOneFailed")}</span>
            <button
              type="button"
              onClick={() => void clientQuery.refetch()}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("common.retry")}
            </button>
          </div>
        ) : null}

        {client ? (
          <>
            {activeTab === "overview" ? (
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-slate-950">
                    {t("clients.overviewTitle")}
                  </h3>
                  <dl className="mt-3 grid grid-cols-1 border-y border-slate-200 sm:grid-cols-2 lg:grid-cols-3">
                    <SummaryField
                      label={t("clients.clientType")}
                      value={enumLabel(clientTypeLabels, client.type)}
                    />
                    <SummaryField label={t("clients.inn")} value={client.inn} />
                    <SummaryField label={t("common.phone")} value={client.phone} />
                    <SummaryField label={t("common.email")} value={client.email} />
                    <SummaryField label={t("common.region")} value={client.region} />
                    <SummaryField label={t("common.address")} value={client.address} />
                    <SummaryField
                      label={t("clients.segment")}
                      value={
                        client.segment
                          ? enumLabel(clientSegmentLabels, client.segment)
                          : null
                      }
                    />
                    <SummaryField label={t("common.source")} value={client.source} />
                    <SummaryField
                      label={t("clients.primaryContact")}
                      value={primaryContact ? contactName(primaryContact) : null}
                    />
                  </dl>
                </section>

                {canUpdateClient ? (
                  <ClientPhoneEmailForm client={client} />
                ) : null}

                <section>
                  <h3 className="text-sm font-semibold text-slate-950">
                    {t("clients.commercialHistory")}
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-px border border-slate-200 bg-slate-200 sm:grid-cols-4">
                    <Metric label={t("clients.contacts")} value={client.contacts?.length ?? 0} />
                    <Metric
                      label={t("clients.objects")}
                      value={client.projectObjects?.length ?? 0}
                    />
                    <Metric label={t("clients.leads")} value={client.leads?.length ?? 0} />
                    <Metric label={t("clients.deals")} value={client.deals?.length ?? 0} />
                  </div>
                </section>

                {client.comment ? (
                  <section>
                    <h3 className="text-sm font-semibold text-slate-950">
                      {t("common.comment")}
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap border-l-2 border-slate-300 pl-3 text-sm text-slate-700">
                      {client.comment}
                    </p>
                  </section>
                ) : null}
              </div>
            ) : null}

            {activeTab === "contacts" ? (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          {t("users.fullName")}
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          {t("common.position")}
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          {t("common.phone")}
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          {t("common.email")}
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          {t("common.messenger")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(client.contacts ?? []).map((contact) => (
                        <tr key={contact.id}>
                          <td className="px-3 py-2 font-medium text-slate-950">
                            {contactName(contact)}
                            {contact.isPrimary ? (
                              <span className="ml-2 text-xs font-normal text-slate-500">
                                {t("common.primary")}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {contact.position ?? t("common.dash")}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {contact.phone ?? t("common.dash")}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {contact.email ?? t("common.dash")}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {contact.messenger ?? t("common.dash")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(client.contacts ?? []).length === 0 ? (
                  <SectionEmpty>{t("clients.emptyContacts")}</SectionEmpty>
                ) : null}

                <form
                  onSubmit={(event) => {
                    void handleSubmit(submitContact)(event);
                  }}
                  className="rounded border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="mb-3 text-sm font-semibold text-slate-950">
                    {t("clients.quickAddContact")}
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                    <input
                      placeholder={t("common.firstName")}
                      className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                      {...register("firstName")}
                    />
                    <input
                      placeholder={t("common.lastName")}
                      className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                      {...register("lastName")}
                    />
                    <input
                      placeholder={t("common.position")}
                      className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                      {...register("position")}
                    />
                    <input
                      type="tel"
                      placeholder={t("common.phone")}
                      className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                      {...register("phone")}
                    />
                    <input
                      placeholder="Email"
                      className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                      {...register("email")}
                    />
                  </div>
                  {(errors.firstName ?? errors.phone ?? errors.email) ? (
                    <div className="mt-2 text-sm text-red-600">
                      {errors.firstName?.message ??
                        errors.phone?.message ??
                        errors.email?.message}
                    </div>
                  ) : null}
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={!isValid || addContact.isPending}
                      className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
                    >
                      {t("clients.addContact")}
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
                    {t("clients.addObject")}
                  </button>
                </div>
                <div className="overflow-x-auto rounded border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          {t("common.titleField")}
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          {t("common.address")}
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          {t("clients.objectStage")}
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          {t("clients.areaM2")}
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          {t("clients.objectDeadline")}
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
                            {object.address ?? t("common.dash")}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {object.stage ?? t("common.dash")}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatNumber(object.approximateArea)}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatDate(object.expectedDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(client.projectObjects ?? []).length === 0 ? (
                  <SectionEmpty>{t("clients.emptyObjects")}</SectionEmpty>
                ) : null}
              </div>
            ) : null}

            {activeTab === "leads" ? (
              (client.leads ?? []).length > 0 ? (
                <div className="overflow-x-auto border border-slate-200">
                  <table className="min-w-[820px] w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <TableHeader>{t("clients.lead")}</TableHeader>
                        <TableHeader>{t("common.source")}</TableHeader>
                        <TableHeader>{t("common.status")}</TableHeader>
                        <TableHeader>{t("clients.owner")}</TableHeader>
                        <TableHeader>{t("common.created")}</TableHeader>
                        <TableHeader className="text-right">{t("clients.action")}</TableHeader>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(client.leads ?? []).map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-3 font-medium text-slate-950">
                            {lead.title}
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            {sourceLabel(lead.source, t("clients.website"))}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${leadStatusClass(lead.status)}`}
                            >
                              {enumLabel(leadStatusLabels, lead.status)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            {resolveUserName(undefined, lead.ownerId, usersById)}
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            {formatDateTime(lead.createdAt)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Link
                              href={`/leads/${lead.id}`}
                              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {t("common.open")}
                              <ExternalLink
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <SectionEmpty>{t("clients.emptyLeads")}</SectionEmpty>
              )
            ) : null}

            {activeTab === "deals" ? (
              (client.deals ?? []).length > 0 ? (
                <div className="overflow-x-auto border border-slate-200">
                  <table className="min-w-[900px] w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <TableHeader>{t("clients.deal")}</TableHeader>
                        <TableHeader>{t("reports.stage")}</TableHeader>
                        <TableHeader>{t("common.amount")}</TableHeader>
                        <TableHeader>{t("clients.owner")}</TableHeader>
                        <TableHeader>{t("clients.updatedColumn")}</TableHeader>
                        <TableHeader className="text-right">{t("clients.action")}</TableHeader>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(client.deals ?? []).map((deal) => (
                        <tr key={deal.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-3">
                            <div className="font-medium text-slate-950">
                              {deal.title}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {t("clients.nextAction", {
                                date: formatDateTime(deal.nextActionAt),
                              })}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            {enumLabel(dealStageLabels, deal.stage)}
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            {formatMoney(deal.totalAmount)}
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            {resolveUserName(deal.owner, deal.ownerId, usersById)}
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            {formatDateTime(deal.updatedAt)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Link
                              href="/deals"
                              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {t("clients.toDeals")}
                              <ExternalLink
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <SectionEmpty>{t("clients.emptyDeals")}</SectionEmpty>
              )
            ) : null}

            {activeTab === "quotes" ? (
              <ClientQuotes clientId={clientId} />
            ) : null}

            {activeTab === "documents" ? (
              <ClientDocuments clientId={clientId} />
            ) : null}

            {activeTab === "timeline" ? (
              <div className="space-y-2">
                {!canReadAudit ? (
                  <SectionEmpty>
                    {t("clients.timelineForbidden")}
                  </SectionEmpty>
                ) : null}
                {timelineQuery.isLoading ? (
                  <div className="text-sm text-slate-600">
                    {t("clients.timelineLoading")}
                  </div>
                ) : null}
                {timelineQuery.isError ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <span>{t("clients.timelineLoadFailed")}</span>
                    <button
                      type="button"
                      onClick={() => void timelineQuery.refetch()}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("common.retry")}
                    </button>
                  </div>
                ) : null}
                {!timelineQuery.isError &&
                (timelineQuery.data ?? []).map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-slate-200 py-3 text-sm last:border-b-0"
                  >
                    <div className="font-medium text-slate-950">
                      {item.type}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {formatDateTime(item.createdAt)} ·{" "}
                      {resolveUserName(item.author, item.authorId, usersById)}
                    </div>
                    {item.content ? (
                      <div className="mt-2 text-slate-700">
                        {item.content}
                      </div>
                    ) : null}
                  </div>
                ))}
                {canReadAudit &&
                !timelineQuery.isLoading &&
                !timelineQuery.isError &&
                (timelineQuery.data ?? []).length === 0 ? (
                  <SectionEmpty>{t("clients.emptyTimeline")}</SectionEmpty>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <AddObjectModal
        clientId={clientId}
        isOpen={isAddObjectOpen}
        onClose={() => setIsAddObjectOpen(false)}
      />
    </div>
  );
}

function ClientPhoneEmailForm({ client }: { client: Client }) {
  const { t, messages } = useI18n();
  const updateClient = useUpdateClient();
  const clientContactSchema = useMemo(
    () => createClientContactSchema(messages),
    [messages],
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm<ClientContactFormValues>({
    resolver: zodResolver(clientContactSchema),
    mode: "onChange",
    defaultValues: {
      phone: client.phone ?? "",
      email: client.email ?? "",
    },
  });

  useEffect(() => {
    reset({
      phone: client.phone ?? "",
      email: client.email ?? "",
    });
  }, [client.email, client.phone, reset]);

  const onSubmit = async (values: ClientContactFormValues): Promise<void> => {
    await updateClient.mutateAsync({
      id: client.id,
      ...buildUpdateClientContactPayload(values),
    });
  };

  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-950">
        {t("clients.phoneAndEmail")}
      </h3>
      <form
        className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
      >
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            {t("common.phone")}
          </span>
          <input
            type="tel"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("phone")}
          />
          {errors.phone ? (
            <span className="mt-1 block text-sm text-red-600">
              {errors.phone.message}
            </span>
          ) : null}
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </span>
          <input
            type="email"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("email")}
          />
          {errors.email ? (
            <span className="mt-1 block text-sm text-red-600">
              {errors.email.message}
            </span>
          ) : null}
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={!isValid || !isDirty || updateClient.isPending}
            className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
          >
            {updateClient.isPending ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </section>
  );
}

function SummaryField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="border-b border-slate-200 px-3 py-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-900">
        {value?.trim() || "—"}
      </dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="text-xl font-semibold text-slate-950">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function TableHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-3 py-2 text-left font-semibold text-slate-700 ${className}`}>
      {children}
    </th>
  );
}

function SectionEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
      {children}
    </div>
  );
}
