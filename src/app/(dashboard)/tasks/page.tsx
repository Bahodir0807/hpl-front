'use client';

import { useMemo, useState } from 'react';
import { CreateTaskModal } from '../../../components/tasks/create-task-modal';
import { TasksTable } from '../../../components/tasks/tasks-table';
import { Pagination } from '../../../components/ui/pagination';
import { useAuth } from '../../../context/auth-context';
import {
  TaskComputedStatus,
  TaskStatus,
  useTasks,
} from '../../../hooks/use-tasks';
import { useI18n } from '@/i18n/provider';
import { useLabelMaps } from '@/i18n/use-label-maps';

type StatusFilter = 'ALL' | Extract<TaskStatus, 'PENDING' | 'COMPLETED'>;
type ComputedStatusFilter = 'ALL' | 'OVERDUE' | 'CRITICAL_OVERDUE';

export default function TasksPage() {
  const { t } = useI18n();
  const labels = useLabelMaps();
  const { user } = useAuth();
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [computedStatus, setComputedStatus] =
    useState<ComputedStatusFilter>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const filters = useMemo(
    () => ({
      status: status === 'ALL' ? undefined : status,
      computedStatus:
        computedStatus === 'ALL'
          ? undefined
          : (computedStatus as TaskComputedStatus),
      page,
      limit: 20,
    }),
    [computedStatus, page, status],
  );
  const tasksQuery = useTasks(filters);
  const tasks = tasksQuery.data?.items ?? [];
  const total = tasksQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);
  const statusOptions = useMemo(
    (): { value: StatusFilter; label: string }[] => [
      { value: 'ALL', label: t('common.allStatuses') },
      { value: 'PENDING', label: labels.taskStatusLabels.PENDING },
      { value: 'COMPLETED', label: labels.taskStatusLabels.COMPLETED },
    ],
    [labels.taskStatusLabels, t],
  );
  const computedStatusOptions = useMemo(
    (): { value: ComputedStatusFilter; label: string }[] => [
      { value: 'ALL', label: t('tasks.allDeadlines') },
      { value: 'OVERDUE', label: labels.taskComputedStatusLabels.OVERDUE },
      {
        value: 'CRITICAL_OVERDUE',
        label: labels.taskComputedStatusLabels.CRITICAL_OVERDUE,
      },
    ],
    [labels.taskComputedStatusLabels, t],
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              {t('tasks.title')}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t('tasks.subtitle')}</p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            {t('tasks.create')}
          </button>
        </div>

        <div className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-medium">{t('tasks.status')}</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);
                setPage(1);
              }}
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
            <span className="font-medium">{t('tasks.overdueFilter')}</span>
            <select
              value={computedStatus}
              onChange={(event) => {
                setComputedStatus(event.target.value as ComputedStatusFilter);
                setPage(1);
              }}
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
            {t('tasks.loading')}
          </div>
        ) : null}

        {tasksQuery.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {t('tasks.loadFailed')}
          </div>
        ) : null}

        {!tasksQuery.isLoading && !tasksQuery.isError && tasks.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white p-8 text-center">
            <div className="text-sm font-medium text-slate-900">
              {t('tasks.empty')}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {t('tasks.emptyHint')}
            </div>
          </div>
        ) : null}

        {!tasksQuery.isLoading && !tasksQuery.isError && tasks.length > 0 ? (
          <TasksTable tasks={tasks} />
        ) : null}

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
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
