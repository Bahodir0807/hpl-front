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
import { clientSegmentLabels } from "../../lib/labels";
import { optionalInnSchema } from "../../lib/validations/inn";
import { optionalPhoneSchema } from "../../lib/validations/phone";
import { buildCreateClientPayload } from "../../lib/client-contact";

const clientSegments: ClientSegment[] = [
  "DEALER",
  "ARCHITECT",
  "CONTRACTOR",
  "END_CUSTOMER",
  "OTHER",
];

const createClientSchema = z.object({
  type: z.enum(["COMPANY", "INDIVIDUAL"]),
  name: z.string().trim().min(2, "Укажите название клиента"),
  inn: optionalInnSchema,
  phone: optionalPhoneSchema,
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Некорректный email",
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
  contactPhone: optionalPhoneSchema,
  contactEmail: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Некорректный email контакта",
    }),
});

type CreateClientFormInput = z.input<typeof createClientSchema>;
type CreateClientFormValues = z.output<typeof createClientSchema>;

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
  const createClient = useCreateClient();
  const [duplicateInput, setDuplicateInput] = useState({
    inn: "",
    phone: "",
    email: "",
    name: "",
  });
  const duplicatesQuery = useCheckClientDuplicates(duplicateInput);
  const duplicates = duplicatesQuery.data ?? [];
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
              Добавить клиента
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Проверка дублей запускается по ИНН, телефону и email.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            Закрыть
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
                Тип
              </span>
              <select
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("type")}
              >
                <option value="COMPANY">COMPANY</option>
                <option value="INDIVIDUAL">INDIVIDUAL</option>
              </select>
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Сегмент
              </span>
              <select
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("segment")}
              >
                <option value="">Не указан</option>
                {clientSegments.map((segment) => (
                  <option key={segment} value={segment}>
                    {clientSegmentLabels[segment]}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Название
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
                ИНН
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
                Телефон
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
                Регион
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("region")}
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Адрес
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("address")}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Контакт: имя
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("contactFirstName")}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Контакт: фамилия
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("contactLastName")}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Контакт: телефон
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
                Контакт: email
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
            <p className="text-sm text-slate-600">Проверка дублей...</p>
          ) : null}

          {duplicates.length > 0 ? (
            <div className="rounded border border-yellow-300 bg-yellow-50 p-3">
              <div className="text-sm font-semibold text-yellow-900">
                Найдены похожие клиенты:
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
            <p className="text-sm text-red-600">Не удалось создать клиента.</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!isValid || createClient.isPending}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
