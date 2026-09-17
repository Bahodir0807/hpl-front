"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Controller, Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { SearchCombobox } from "../ui/search-combobox";
import { RoleName, User, useCreateUser, useUpdateUser, useUsersList } from "../../hooks/use-users";
import { formatPersonName } from "../../lib/display-names";
import { ADMIN_PROVISIONABLE_ROLES } from "../../lib/labels";
import { createOptionalPhoneSchema } from "../../lib/validations/phone";
import { useI18n } from "@/i18n/provider";
import type { Messages } from "@/i18n/types";
import { useLabelMaps } from "@/i18n/use-label-maps";

const roles: RoleName[] = ADMIN_PROVISIONABLE_ROLES;

function createUserFormSchema(messages: Messages) {
  const optionalUuid = z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().uuid().safeParse(value).success, {
      message: messages.validation.uuidInvalid,
    });

  return z.object({
    email: z.string().trim().email(messages.validation.invalidEmail),
    firstName: z.string().trim().min(1, messages.validation.firstNameRequired),
    lastName: z.string().trim().min(1, messages.validation.lastNameRequired),
    phone: createOptionalPhoneSchema(messages),
    managerId: optionalUuid,
    roleName: z.enum(["ADMIN", "MANAGER", "STOREKEEPER"]),
    isActive: z.boolean(),
    password: z.string(),
  });
}

function createUserSchema(messages: Messages) {
  return createUserFormSchema(messages).superRefine((values, ctx) => {
    if (values.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: messages.validation.passwordMin8,
      });
    }
  });
}

type UserFormValues = z.infer<ReturnType<typeof createUserFormSchema>>;

function getUserFormResolver(
  isEditing: boolean,
  messages: Messages,
): Resolver<UserFormValues> {
  return zodResolver(isEditing ? createUserFormSchema(messages) : createUserSchema(messages));
}

type UserModalProps = {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
};

export function UserModal({ user, isOpen, onClose }: UserModalProps) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { t, messages } = useI18n();
  const { roleLabels } = useLabelMaps();
  const { users } = useUsersList();
  const isEditing = Boolean(user);
  const managerOptions = useMemo(
    () =>
      users
        .filter((item) => item.id !== user?.id)
        .map((item) => ({
          value: item.id,
          label: formatPersonName(item, item.email),
          description: item.email,
        })),
    [user?.id, users],
  );
  const resolver = useMemo(
    () => getUserFormResolver(isEditing, messages),
    [isEditing, messages],
  );
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<UserFormValues>({
    resolver,
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      managerId: "",
      roleName: "MANAGER",
      isActive: true,
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

    reset({
      email: user?.email ?? "",
      password: "",
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      phone: user?.phone ?? "",
      managerId: user?.managerId ?? "",
      roleName: "MANAGER",
      isActive: user?.isActive ?? true,
    });
  }, [isOpen, reset, user]);

  if (!isOpen) {
    return null;
  }

  const onSubmit = async (values: UserFormValues): Promise<void> => {
    if (user) {
      await updateUser.mutateAsync({
        id: user.id,
        isActive: values.isActive,
      });
    } else {
      await createUser.mutateAsync({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || undefined,
        managerId: values.managerId || undefined,
        roleNames: [values.roleName],
      });
    }

    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-2xl rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              {isEditing ? t("users.editTitle") : t("users.createTitle")}
            </h2>
            {isEditing ? (
              <p className="mt-1 text-sm text-slate-600">
                {t("users.editHint")}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700"
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
                Email
              </span>
              <input
                disabled={isEditing}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
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
                {t("common.password")}
              </span>
              <input
                disabled={isEditing}
                type="password"
                autoComplete="new-password"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                {...register("password")}
              />
              {!isEditing ? (
                <span className="mt-1 block text-xs text-slate-500">
                  {t("users.passwordHint")}
                </span>
              ) : null}
              {errors.password ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.password.message}
                </span>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("common.firstName")}
              </span>
              <input
                disabled={isEditing}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                {...register("firstName")}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("common.lastName")}
              </span>
              <input
                disabled={isEditing}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                {...register("lastName")}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("common.phone")}
              </span>
              <input
                disabled={isEditing}
                type="tel"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
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
                {t("users.role")}
              </span>
              {isEditing ? (
                <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {(user?.roles ?? [])
                    .map((item) =>
                      item.role?.name ? roleLabels[item.role.name] : null,
                    )
                    .filter(Boolean)
                    .join(', ') || '—'}
                </div>
              ) : (
                <select
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                  {...register("roleName")}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {t("users.supervisor")}
              </span>
              <Controller
                name="managerId"
                control={control}
                render={({ field }) => (
                  <SearchCombobox
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={managerOptions}
                    placeholder={t("users.selectSupervisor")}
                    searchPlaceholder={t("users.searchEmployee")}
                    emptyLabel={t("users.employeesEmpty")}
                    disabled={isEditing}
                  />
                )}
              />
              {errors.managerId ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.managerId.message}
                </span>
              ) : null}
            </label>

            <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                {...register("isActive")}
              />
              {t("users.active")}
            </label>
          </div>

          {isEditing ? (
            <button
              type="button"
              disabled
              className="rounded border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-500"
            >
              {t("users.passwordResetUnavailable")}
            </button>
          ) : null}

          {createUser.isError || updateUser.isError ? (
            <p className="text-sm text-red-600">
              {t("users.saveFailed")}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={
                !isValid || createUser.isPending || updateUser.isPending
              }
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
            >
              {t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
