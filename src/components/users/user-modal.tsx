"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  RoleName,
  User,
  useCreateUser,
  useUpdateUser,
} from "../../hooks/use-users";

const roles: RoleName[] = [
  "ADMIN",
  "HEAD",
  "MANAGER",
  "STOREKEEPER",
  "OBSERVER",
];

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || z.string().uuid().safeParse(value).success, {
    message: "Укажите корректный UUID",
  });

const userSchema = z.object({
  email: z.string().trim().email("Некорректный email"),
  password: z.string().min(8, "Минимум 8 символов").optional(),
  firstName: z.string().trim().min(1, "Укажите имя"),
  lastName: z.string().trim().min(1, "Укажите фамилию"),
  phone: z.string().trim().optional(),
  managerId: optionalUuid,
  roleName: z.enum(["ADMIN", "HEAD", "MANAGER", "STOREKEEPER", "OBSERVER"]),
  isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof userSchema>;

type UserModalProps = {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
};

export function UserModal({ user, isOpen, onClose }: UserModalProps) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const isEditing = Boolean(user);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "Password123!",
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
      password: user ? undefined : "Password123!",
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
        password: values.password ?? "Password123!",
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
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                {...register("password")}
              />
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
                Роль
              </span>
              <select
                disabled={isEditing}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                {...register("roleName")}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Руководитель
              </span>
              <input
                disabled={isEditing}
                placeholder="UUID руководителя"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                {...register("managerId")}
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
