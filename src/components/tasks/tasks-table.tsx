'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Task,
  TaskComputedStatus,
  TaskPriority,
  TaskType,
} from '../../hooks/use-tasks';
import { CompleteTaskModal } from './complete-task-modal';
import { RescheduleTaskModal } from './reschedule-task-modal';

type TasksTableProps = {
  tasks: Task[];
};

const taskTypeLabels: Record<TaskType, string> = {
  FIRST_CONTACT: 'Первый контакт',
  CALL: 'Звонок',
  MESSAGE: 'Сообщение',
  EMAIL: 'Email',
  MEETING: 'Встреча',
  SAMPLE_SEND: 'Образцы',
  CALCULATION: 'Расчет',
  OFFER: 'КП',
  PAYMENT_CHECK: 'Оплата',
  SHIPMENT_CHECK: 'Отгрузка',
  OTHER: 'Другое',
};

const priorityClassNames: Record<TaskPriority, string> = {
  LOW: 'text-slate-600',
  MEDIUM: 'text-slate-700',
  HIGH: 'font-medium text-orange-700',
  URGENT: 'font-semibold text-red-700',
};

const computedStatusClassNames: Record<TaskComputedStatus, string> = {
  ON_TIME: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TODAY: 'bg-blue-50 text-blue-700 border-blue-200',
  WARNING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  OVERDUE: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL_OVERDUE: 'bg-red-50 text-red-700 border-red-200 font-semibold',
  BLOCKED: 'bg-slate-100 text-slate-700 border-slate-300',
};

export function TasksTable({ tasks }: TasksTableProps) {
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [taskToReschedule, setTaskToReschedule] = useState<Task | null>(null);
  const sortedTasks = useMemo(
    () =>
      [...tasks].sort(
        (left, right) =>
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
      ),
    [tasks],
  );

  return (
    <>
      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-56 px-3 py-2 text-left font-semibold text-slate-700">
                Срок
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Задача / Тип
              </th>
              <th className="w-64 px-3 py-2 text-left font-semibold text-slate-700">
                Связанный объект
              </th>
              <th className="w-28 px-3 py-2 text-left font-semibold text-slate-700">
                Приоритет
              </th>
              <th className="w-24 px-3 py-2 text-left font-semibold text-slate-700">
                Переносы
              </th>
              <th className="w-52 px-3 py-2 text-right font-semibold text-slate-700">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {sortedTasks.map((task) => (
              <tr key={task.id} className="align-top">
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-900">
                    {formatDateTime(task.dueDate)}
                  </div>
                  <span
                    className={`mt-1 inline-flex rounded border px-2 py-0.5 text-xs ${computedStatusClassNames[task.computedStatus]}`}
                  >
                    {task.computedStatus}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-950">{task.title}</div>
                  <div className="mt-1 inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                    {taskTypeLabels[task.type]}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="text-slate-700">{task.relatedType}</div>
                  {getRelatedHref(task.relatedType, task.relatedId) ? (
                    <Link
                      href={getRelatedHref(task.relatedType, task.relatedId)}
                      className="font-mono text-xs text-blue-700 hover:underline"
                    >
                      {task.relatedId}
                    </Link>
                  ) : (
                    <div className="font-mono text-xs text-slate-500">
                      {task.relatedId}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className={priorityClassNames[task.priority]}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {task.rescheduleCount > 0 ? (
                    <button
                      type="button"
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                    >
                      {task.rescheduleCount} история
                    </button>
                  ) : (
                    <span className="text-slate-500">0</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setTaskToComplete(task)}
                      className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Завершить
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskToReschedule(task)}
                      className="rounded bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white"
                    >
                      Перенести
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CompleteTaskModal
        task={taskToComplete}
        isOpen={taskToComplete !== null}
        onClose={() => setTaskToComplete(null)}
      />
      <RescheduleTaskModal
        task={taskToReschedule}
        isOpen={taskToReschedule !== null}
        onClose={() => setTaskToReschedule(null)}
      />
    </>
  );
}

function getRelatedHref(relatedType: string, relatedId: string): string {
  const normalizedType = relatedType.toLowerCase();

  if (normalizedType === 'lead') {
    return `/leads/${relatedId}`;
  }

  if (normalizedType === 'deal') {
    return `/deals/${relatedId}`;
  }

  if (normalizedType === 'client') {
    return `/clients/${relatedId}`;
  }

  return '';
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
