'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Task, useCompleteTask } from '../../hooks/use-tasks';
import { useI18n } from '@/i18n/provider';
import { localizeSystemText } from '@/i18n/system-labels';

type CompleteTaskFormValues = {
  result: string;
};

type CompleteTaskModalProps = {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
};

export function CompleteTaskModal({
  task,
  isOpen,
  onClose,
}: CompleteTaskModalProps) {
  const completeTask = useCompleteTask();
  const { t } = useI18n();
  const completeTaskSchema = useMemo(
    () =>
      z.object({
        result: z.string().min(3, t('validation.taskResultRequired')),
      }),
    [t],
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompleteTaskFormValues>({
    resolver: zodResolver(completeTaskSchema),
    defaultValues: { result: '' },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen || !task) {
    return null;
  }

  const onSubmit = async (values: CompleteTaskFormValues): Promise<void> => {
    await completeTask.mutateAsync({
      id: task.id,
      result: values.result,
    });

    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-950">
            {t('tasks.completeTitle')}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {localizeSystemText(task.title)}
          </p>
        </div>

        <form
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {t('tasks.result')}
            </span>
            <textarea
              rows={4}
              className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              {...register('result')}
            />
            {errors.result ? (
              <span className="mt-1 block text-sm text-red-600">
                {errors.result.message}
              </span>
            ) : null}
          </label>

          {completeTask.isError ? (
            <p className="text-sm text-red-600">{t('tasks.completeFailed')}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={completeTask.isPending}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
            >
              {t('tasks.complete')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
