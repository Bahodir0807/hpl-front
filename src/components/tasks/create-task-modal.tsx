'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { TaskPriority, TaskType, useCreateTask } from '../../hooks/use-tasks';

const taskTypes: TaskType[] = [
  'FIRST_CONTACT',
  'CALL',
  'MESSAGE',
  'EMAIL',
  'MEETING',
  'SAMPLE_SEND',
  'CALCULATION',
  'OFFER',
  'PAYMENT_CHECK',
  'SHIPMENT_CHECK',
  'OTHER',
];

const taskPriorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const createTaskSchema = z.object({
  title: z.string().min(3, 'Название должно быть не короче 3 символов'),
  description: z.string().optional(),
  type: z.enum(taskTypes),
  priority: z.enum(taskPriorities),
  dueDate: z.string().min(1, 'Укажите срок'),
  relatedType: z.string().min(1, 'Укажите тип объекта'),
  relatedId: z.uuid('Укажите UUID объекта'),
});

type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

type CreateTaskModalProps = {
  assigneeId: string;
  isOpen: boolean;
  onClose: () => void;
};

export function CreateTaskModal({
  assigneeId,
  isOpen,
  onClose,
}: CreateTaskModalProps) {
  const createTask = useCreateTask();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'CALL',
      priority: 'MEDIUM',
      dueDate: '',
      relatedType: 'Task',
      relatedId: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen) {
    return null;
  }

  const onSubmit = async (values: CreateTaskFormValues): Promise<void> => {
    await createTask.mutateAsync({
      title: values.title,
      description: values.description || undefined,
      type: values.type,
      priority: values.priority,
      dueDate: new Date(values.dueDate).toISOString(),
      assigneeId,
      relatedType: values.relatedType,
      relatedId: values.relatedId,
    });

    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-lg rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-950">
            Создать задачу
          </h2>
        </div>

        <form
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="grid grid-cols-2 gap-4"
        >
          <label className="col-span-2 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Название
            </span>
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              {...register('title')}
            />
            {errors.title ? (
              <span className="mt-1 block text-sm text-red-600">
                {errors.title.message}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Тип
            </span>
            <select
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              {...register('type')}
            >
              {taskTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Приоритет
            </span>
            <select
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              {...register('priority')}
            >
              {taskPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Срок
            </span>
            <input
              type="datetime-local"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              {...register('dueDate')}
            />
            {errors.dueDate ? (
              <span className="mt-1 block text-sm text-red-600">
                {errors.dueDate.message}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Тип объекта
            </span>
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              {...register('relatedType')}
            />
            {errors.relatedType ? (
              <span className="mt-1 block text-sm text-red-600">
                {errors.relatedType.message}
              </span>
            ) : null}
          </label>

          <label className="col-span-2 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              UUID объекта
            </span>
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-slate-500"
              {...register('relatedId')}
            />
            {errors.relatedId ? (
              <span className="mt-1 block text-sm text-red-600">
                {errors.relatedId.message}
              </span>
            ) : null}
          </label>

          <label className="col-span-2 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Описание
            </span>
            <textarea
              rows={3}
              className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              {...register('description')}
            />
          </label>

          {createTask.isError ? (
            <p className="col-span-2 text-sm text-red-600">
              Не удалось создать задачу
            </p>
          ) : null}

          <div className="col-span-2 flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={createTask.isPending}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
