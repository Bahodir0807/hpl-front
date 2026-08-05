'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Task, useRescheduleTask } from '../../hooks/use-tasks';

const rescheduleSchema = z.object({
  newDueDate: z.string().min(1, 'Укажите новую дату и время'),
  reason: z.string().min(5, 'Причина должна быть не короче 5 символов'),
});

type RescheduleFormValues = z.infer<typeof rescheduleSchema>;

type RescheduleTaskModalProps = {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
};

export function RescheduleTaskModal({
  task,
  isOpen,
  onClose,
}: RescheduleTaskModalProps) {
  const queryClient = useQueryClient();
  const rescheduleTask = useRescheduleTask();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RescheduleFormValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      newDueDate: '',
      reason: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen || !task) {
    return null;
  }

  const onSubmit = async (values: RescheduleFormValues): Promise<void> => {
    await rescheduleTask.mutateAsync({
      id: task.id,
      newDueDate: new Date(values.newDueDate).toISOString(),
      reason: values.reason,
    });

    reset();
    onClose();
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-950">
            Перенести срок
          </h2>
          <p className="mt-1 text-sm text-slate-600">{task.title}</p>
        </div>

        <form
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Новая дата и время
            </span>
            <input
              type="datetime-local"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              {...register('newDueDate')}
            />
            {errors.newDueDate ? (
              <span className="mt-1 block text-sm text-red-600">
                {errors.newDueDate.message}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Причина
            </span>
            <textarea
              rows={4}
              className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              {...register('reason')}
            />
            {errors.reason ? (
              <span className="mt-1 block text-sm text-red-600">
                {errors.reason.message}
              </span>
            ) : null}
          </label>

          {rescheduleTask.isError ? (
            <p className="text-sm text-red-600">Не удалось перенести задачу</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={rescheduleTask.isPending}
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
