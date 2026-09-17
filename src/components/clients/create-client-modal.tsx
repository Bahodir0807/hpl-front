"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  ClientSegment,
  ClientType,
  useCheckClientDuplicates,
  useCreateClient,
} from "../../hooks/use-clients";
import { createOptionalInnSchema } from "../../lib/validations/inn";
import { createOptionalPhoneSchema } from "../../lib/validations/phone";
import { buildCreateClientPayload } from "../../lib/client-contact";
import { useI18n } from "@/i18n/provider";
import type { Messages } from "@/i18n/types";
import { useLabelMaps } from "@/i18n/use-label-maps";

const clientSegments: ClientSegment[] = [
  "DEALER",
  "ARCHITECT",
  "CONTRACTOR",
  "END_CUSTOMER",
  "OTHER",
];

function createClientSchemaFactory(messages: Messages) {
  return z.object({
    type: z.enum(["COMPANY", "INDIVIDUAL"]),
    name: z.string().trim().min(2, messages.validation.clientNameRequired),
    inn: createOptionalInnSchema(messages),
    phone: createOptionalPhoneSchema(messages),
    email: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || z.string().email().safeParse(value).success, {
        message: messages.validation.invalidEmail,
      }),
    segment: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .enum(['DEALER', 'ARCHITECT', 'CONTRACTOR', 'END_CUSTOMER', 'OTHER'])
        .optional(),
    ),
    region: z.string().trim().optional(),
    address: z.string().trim().optional(),
    source: z.string().trim().optional(),
    comment: z.string().trim().optional(),
    contactFirstName: z.string().trim().optional(),
    contactLastName: z.string().trim().optional(),
    contactPhone: createOptionalPhoneSchema(messages),
    contactEmail: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || z.string().email().safeParse(value).success, {
        message: messages.validation.invalidEmail,
      }),
  });
}

type CreateClientFormInput = z.input<ReturnType<typeof createClientSchemaFactory>>;
type CreateClientFormValues = z.output<ReturnType<typeof createClientSchemaFactory>>;

type CreateClientModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CreateClientModal({ isOpen, onClose }: CreateClientModalProps) {
  if (!isOpen) {
    return null;
  }

  return <CreateClientModalContent onClose={onClose} />;
}

function CreateClientModalContent({ onClose }: { onClose: () => void }) {
  const { t, messages } = useI18n();
  const { clientSegmentLabels, clientTypeLabels } = useLabelMaps();
  const createClient = useCreateClient();
  const [duplicateInput, setDuplicateInput] = useState({
    inn: "",
    phone: "",
    email: "",
    name: "",
  });
  const duplicatesQuery = useCheckClientDuplicates(duplicateInput);
  const duplicates = duplicatesQuery.data ?? [];
  const createClientSchema = useMemo(
    () => createClientSchemaFactory(messages),
    [messages],
  );
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<CreateClientFormInput, unknown, CreateClientFormValues>({
    resolver: zodResolver(createClientSchema),
    mode: "onChange",
    defaultValues: {
      type: "COMPANY",
      name: "",
      inn: "",
      phone: "",
      email: "",
      segment: undefined,
      region: "",
      address: "",
      source: "",
      comment: "",
      contactFirstName: "",
      contactLastName: "",
      contactPhone: "",
      contactEmail: "",
    },
  });
  const watchedValues = useWatch({ control });
  const watchedDuplicateFields = useMemo(
    () => ({
      inn: watchedValues.inn ?? "",
      phone: watchedValues.phone ?? "",
      email: watchedValues.email ?? "",
      name: watchedValues.name ?? "",
    }),
    [
      watchedValues.email,
      watchedValues.inn,
      watchedValues.name,
      watchedValues.phone,
    ],
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDuplicateInput(watchedDuplicateFields);
    }, 450);

    return () => window.clearTimeout(timerId);
  }, [watchedDuplicateFields]);

  const onSubmit = async (values: CreateClientFormValues): Promise<void> => {
      await createClient.mutateAsync(buildCreateClientPayload({
        type: values.type as ClientType,
        name: values.name,
        inn: values.inn,
        phone: values.phone,
        email: values.email,
        segment: values.segment,
        region: values.region,
        address: values.address,
        source: values.source,
        comment: values.comment,
        contactFirstName: values.contactFirstName,
        contactLastName: values.contactLastName,
        contactPhone: values.contactPhone,
        contactEmail: values.contactEmail,
      }));

    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-3xl rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              {t("clients.createModal.title")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("clients.createModal.hint")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            {t("common.close")}
          </button>
        </div>

        <form
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("clients.type")}
              </span>
              <select
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("type")}
              >
                <option value="COMPANY">{clientTypeLabels.COMPANY}</option>
                <option value="INDIVIDUAL">{clientTypeLabels.INDIVIDUAL}</option>
              </select>
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("clients.segment")}
              </span>
              <select
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("segment")}
              >
                <option value="">{t("clients.createModal.segmentEmpty")}</option>
                {clientSegments.map((segment) => (
                  <option key={segment} value={segment}>
                    {clientSegmentLabels[segment]}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("clients.name")}
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("name")}
              />
              {errors.name ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.name.message}
                </span>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("clients.inn")}
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("inn")}
              />
              {errors.inn ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.inn.message}
                </span>
              ) : null}
            </label>

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

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("common.region")}
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("region")}
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("common.address")}
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("address")}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("clients.createModal.contactFirstName")}
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("contactFirstName")}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("clients.createModal.contactLastName")}
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("contactLastName")}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("clients.createModal.contactPhone")}
              </span>
              <input
                type="tel"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("contactPhone")}
              />
              {errors.contactPhone ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.contactPhone.message}
                </span>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("clients.createModal.contactEmail")}
              </span>
              <input
                type="email"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("contactEmail")}
              />
              {errors.contactEmail ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.contactEmail.message}
                </span>
              ) : null}
            </label>
          </div>

          {duplicatesQuery.isFetching ? (
            <p className="text-sm text-slate-600">{t("clients.createModal.checkingDuplicates")}</p>
          ) : null}

          {duplicates.length > 0 ? (
            <div className="rounded border border-yellow-300 bg-yellow-50 p-3">
              <div className="text-sm font-semibold text-yellow-900">
                {t("clients.createModal.duplicatesFound")}
              </div>
              <div className="mt-2 space-y-1">
                {duplicates.map((duplicate) => (
                  <div
                    key={duplicate.client.id}
                    className="text-sm text-yellow-950"
                  >
                    {duplicate.client.name} · {duplicate.reasons.join(", ")}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {createClient.isError ? (
            <p className="text-sm text-red-600">{t("clients.createModal.createFailed")}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!isValid || createClient.isPending}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
            >
              {t("common.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
