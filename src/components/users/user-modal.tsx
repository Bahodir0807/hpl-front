"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Controller, Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { SearchCombobox } from "../ui/search-combobox";
import { RoleName, User, useCreateUser, useUpdateUser, useUsersList } from "../../hooks/use-users";
import { formatPersonName } from "../../lib/display-names";
import { ADMIN_PROVISIONABLE_ROLES, roleLabels } from "../../lib/labels";
import { optionalPhoneSchema } from "../../lib/validations/phone";

const roles: RoleName[] = ADMIN_PROVISIONABLE_ROLES;

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || z.string().uuid().safeParse(value).success, {
    message: "Укажите корректный UUID",
  });

const userBaseSchema = z.object({
  email: z.string().trim().email("Некорректный email"),
  firstName: z.string().trim().min(1, "Укажите имя"),
  lastName: z.string().trim().min(1, "Укажите фамилию"),
  phone: optionalPhoneSchema,
  managerId: optionalUuid,
  roleName: z.enum(["ADMIN", "MANAGER", "STOREKEEPER", "INSTALLER"]),
  isActive: z.boolean(),
});

const userFormSchema = userBaseSchema.extend({
  password: z.string(),
});

const createUserSchema = userFormSchema.superRefine((values, ctx) => {
  if (values.password.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["password"],
      message: "Минимум 8 символов",
    });
  }
});

type UserFormValues = z.infer<typeof userFormSchema>;

function getUserFormResolver(isEditing: boolean): Resolver<UserFormValues> {
  return zodResolver(isEditing ? userFormSchema : createUserSchema);
}

type UserModalProps = {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
};

export function UserModal({ user, isOpen, onClose }: UserModalProps) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
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
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<UserFormValues>({
    resolver: getUserFormResolver(isEditing),
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
              {isEditing ? "Редактировать сотрудника" : "Создать сотрудника"}
            </h2>
            {isEditing ? (
              <p className="mt-1 text-sm text-slate-600">
                Текущий backend поддерживает изменение статуса через
                /users/:id/status.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700"
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
                Пароль
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
                  Минимум 8 символов
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
                Имя
              </span>
              <input
                disabled={isEditing}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                {...register("firstName")}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Фамилия
              </span>
              <input
                disabled={isEditing}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                {...register("lastName")}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Телефон
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
                Роль
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
                Руководитель
              </span>
              <Controller
                name="managerId"
                control={control}
                render={({ field }) => (
                  <SearchCombobox
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={managerOptions}
                    placeholder="Выберите руководителя"
                    searchPlaceholder="Поиск сотрудника"
                    emptyLabel="Сотрудники не найдены"
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
              Активен
            </label>
          </div>

          {isEditing ? (
            <button
              type="button"
              disabled
              className="rounded border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-500"
            >
              Сброс пароля недоступен в текущем API
            </button>
          ) : null}

          {createUser.isError || updateUser.isError ? (
            <p className="text-sm text-red-600">
              Не удалось сохранить пользователя.
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={
                !isValid || createUser.isPending || updateUser.isPending
              }
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
