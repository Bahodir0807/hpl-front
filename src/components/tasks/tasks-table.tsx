'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Task,
  TaskComputedStatus,
  TaskPriority,
} from '../../hooks/use-tasks';
import { getRelatedEntityHref } from '../../lib/entity-routes';
import { formatDateTime } from '../../lib/format';
import { enumLabel } from '../../lib/labels';
import { useI18n } from '@/i18n/provider';
import { localizeSystemText } from '@/i18n/system-labels';
import { useLabelMaps } from '@/i18n/use-label-maps';
import { CompleteTaskModal } from './complete-task-modal';
import { RescheduleTaskModal } from './reschedule-task-modal';

type TasksTableProps = {
  tasks: Task[];
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
  const { t } = useI18n();
  const {
    taskTypeLabels,
    taskComputedStatusLabels,
    taskPriorityLabels,
    relatedTypeLabels,
  } = useLabelMaps();
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

  const relatedLabel = (task: Task): string => {
    if (task.relatedType === 'LeadRecovery') {
      return task.relatedEntity?.title
        ? t('tasks.leadWithTitle', { title: task.relatedEntity.title })
        : t('tasks.openLead');
    }
    if (task.relatedType === 'DealRecovery') {
      return task.relatedEntity?.title
        ? t('tasks.dealWithTitle', { title: task.relatedEntity.title })
        : t('tasks.openDeal');
    }
    return task.relatedEntity?.title ?? task.relatedId;
  };

  return (
    <>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-56 px-3 py-2 text-left font-semibold text-slate-700">
                {t('tasks.due')}
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                {t('tasks.taskAndType')}
              </th>
              <th className="w-64 px-3 py-2 text-left font-semibold text-slate-700">
                {t('tasks.relatedObject')}
              </th>
              <th className="w-28 px-3 py-2 text-left font-semibold text-slate-700">
                {t('tasks.priority')}
              </th>
              <th className="w-24 px-3 py-2 text-left font-semibold text-slate-700">
                {t('tasks.reschedules')}
              </th>
              <th className="w-52 px-3 py-2 text-right font-semibold text-slate-700">
                {t('common.actions')}
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
                      {enumLabel(taskComputedStatusLabels, task.computedStatus)}
                    </span>
                </td>
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-950">
                    {localizeSystemText(task.title)}
                  </div>
                  {task.description ? (
                    <div className="mt-1 text-xs text-slate-600">
                      {localizeSystemText(task.description)}
                    </div>
                  ) : null}
                  <div className="mt-1 inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                    {enumLabel(taskTypeLabels, task.type)}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="text-slate-700">
                    {enumLabel(relatedTypeLabels, task.relatedType)}
                  </div>
                  {getRelatedHref(task.relatedType, task.relatedId) ? (
                    <Link
                      href={getRelatedHref(task.relatedType, task.relatedId)}
                      className="text-sm text-blue-700 hover:underline"
                    >
                      {relatedLabel(task)}
                    </Link>
                  ) : (
                    <div className="text-sm text-slate-700">
                      {relatedLabel(task)}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className={priorityClassNames[task.priority]}>
                    {enumLabel(taskPriorityLabels, task.priority)}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {task.rescheduleCount > 0 ? (
                    <button
                      type="button"
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                    >
                      {t('tasks.rescheduleHistory', {
                        count: task.rescheduleCount,
                      })}
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
                      {t('tasks.complete')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskToReschedule(task)}
                      className="rounded bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white"
                    >
                      {t('tasks.reschedule')}
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
  return getRelatedEntityHref(relatedType, relatedId) ?? '';
}
