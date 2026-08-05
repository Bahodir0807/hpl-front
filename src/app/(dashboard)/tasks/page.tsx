'use client';

import { useMemo, useState } from 'react';
import { CreateTaskModal } from '../../../components/tasks/create-task-modal';
import { TasksTable } from '../../../components/tasks/tasks-table';
import { useAuth } from '../../../context/auth-context';
import {
  TaskComputedStatus,
  TaskStatus,
  useTasks,
} from '../../../hooks/use-tasks';

type StatusFilter = 'ALL' | Extract<TaskStatus, 'PENDING' | 'COMPLETED'>;
type ComputedStatusFilter = 'ALL' | 'OVERDUE' | 'CRITICAL_OVERDUE';

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Все статусы' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'COMPLETED', label: 'COMPLETED' },
];

const computedStatusOptions: {
  value: ComputedStatusFilter;
  label: string;
}[] = [
  { value: 'ALL', label: 'Все сроки' },
  { value: 'OVERDUE', label: 'OVERDUE' },
  { value: 'CRITICAL_OVERDUE', label: 'CRITICAL_OVERDUE' },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [computedStatus, setComputedStatus] =
    useState<ComputedStatusFilter>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const filters = useMemo(
    () => ({
      status: status === 'ALL' ? undefined : status,
      computedStatus:
        computedStatus === 'ALL'
          ? undefined
          : (computedStatus as TaskComputedStatus),
    }),
    [computedStatus, status],
  );
  const tasksQuery = useTasks(filters);
  const tasks = tasksQuery.data?.items ?? [];

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Мой день / Задачи
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Открытые, просроченные и завершенные задачи пользователя.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            Создать задачу
          </button>
        </div>

        <div className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-medium">Статус</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as StatusFilter)
              }
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-medium">Просрочка</span>
            <select
              value={computedStatus}
              onChange={(event) =>
                setComputedStatus(event.target.value as ComputedStatusFilter)
              }
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            >
              {computedStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {tasksQuery.isLoading ? (
          <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Загрузка задач...
          </div>
        ) : null}

        {tasksQuery.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Не удалось загрузить задачи.
          </div>
        ) : null}

        {!tasksQuery.isLoading && !tasksQuery.isError && tasks.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white p-8 text-center">
            <div className="text-sm font-medium text-slate-900">
              Задач не найдено
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Измените фильтры или создайте новую задачу.
            </div>
          </div>
        ) : null}

        {!tasksQuery.isLoading && !tasksQuery.isError && tasks.length > 0 ? (
          <TasksTable tasks={tasks} />
        ) : null}
      </div>

      {user ? (
        <CreateTaskModal
          assigneeId={user.id}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      ) : null}
    </>
  );
}
