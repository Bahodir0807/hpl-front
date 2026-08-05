"use client";

import { useState } from "react";
import { UserModal } from "../../../components/users/user-modal";
import { useAuth } from "../../../context/auth-context";
import { RoleName, User, useUsers } from "../../../hooks/use-users";

function userName(user: User): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

function userRole(user: User): RoleName | "-" {
  return user.roles?.[0]?.role?.name ?? "-";
}

function canAccessUsers(roles: string[], hasReadPermission: boolean): boolean {
  return hasReadPermission || roles.includes("ADMIN") || roles.includes("HEAD");
}

export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const usersQuery = useUsers();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const canAccess = canAccessUsers(
    currentUser?.roles ?? [],
    hasPermission("users:read"),
  );
  const users = usersQuery.data ?? [];

  if (!canAccess) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Нет доступа к управлению командой.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Команда и доступы
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Пользователи, роли, руководители и блокировка доступа.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            Создать сотрудника
          </button>
        </div>

        {usersQuery.isLoading ? (
          <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Загрузка пользователей...
          </div>
        ) : null}

        {!usersQuery.isLoading ? (
          <div className="overflow-hidden rounded border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    ФИО
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Email
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Роль
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Руководитель
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    Статус
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 font-medium text-slate-950">
                      {userName(item)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{item.email}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {userRole(item)}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs text-slate-700">
                        {item.managerId ?? "-"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-semibold ${
                          item.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {item.isActive ? "Активен" : "Заблокирован"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingUser(item)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Редактировать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-600">
                Пользователи не найдены.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <UserModal
        user={null}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
      <UserModal
        user={editingUser}
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
      />
    </>
  );
}
