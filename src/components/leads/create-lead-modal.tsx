'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../../context/auth-context';
import {
  DuplicateMatch,
  useCheckDuplicates,
  useCreateLead,
} from '../../hooks/use-leads';

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || z.string().uuid().safeParse(value).success, {
    message: 'Укажите корректный UUID',
  });

const createLeadSchema = z.object({
  title: z.string().trim().min(3, 'Укажите название лида'),
  source: z.string().trim().min(2, 'Укажите источник'),
  ownerId: optionalUuid,
  phone: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Некорректный email',
    }),
  inn: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
});

type CreateLeadFormValues = z.infer<typeof createLeadSchema>;

type CreateLeadModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function formatReasons(reasons: string[]): string {
  return reasons.join(', ');
}

function pickDuplicateQuery(values: CreateLeadFormValues): string {
  return values.inn || values.phone || values.email || '';
}

export function CreateLeadModal({ isOpen, onClose }: CreateLeadModalProps) {
  const { user } = useAuth();
  const createLead = useCreateLead();
  const [duplicateQuery, setDuplicateQuery] = useState('');
  const [selectedDuplicate, setSelectedDuplicate] =
    useState<DuplicateMatch | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm<CreateLeadFormValues>({
    resolver: zodResolver(createLeadSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      source: '',
      ownerId: user?.id ?? '',
      phone: '',
      email: '',
      inn: '',
      contactName: '',
    },
  });

  const watchedValues = watch();
  const duplicateSearchValue = useMemo(
    () => pickDuplicateQuery(watchedValues),
    [watchedValues],
  );
  const duplicatesQuery = useCheckDuplicates(duplicateQuery);
  const duplicates = duplicatesQuery.data ?? [];

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDuplicateQuery(duplicateSearchValue.trim());
      setSelectedDuplicate(null);
    }, 450);

    return () => window.clearTimeout(timerId);
  }, [duplicateSearchValue]);

  useEffect(() => {
    if (!isOpen) {
      reset({
        title: '',
        source: '',
        ownerId: user?.id ?? '',
        phone: '',
        email: '',
        inn: '',
        contactName: '',
      });
      setDuplicateQuery('');
      setSelectedDuplicate(null);
    }
  }, [isOpen, reset, user?.id]);

  if (!isOpen) {
    return null;
  }

  const onSubmit = async (values: CreateLeadFormValues): Promise<void> => {
    await createLead.mutateAsync({
      title: values.title,
      source: values.source,
      ownerId: values.ownerId || undefined,
      clientId: selectedDuplicate?.client.id,
    });

    reset();
    setSelectedDuplicate(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-2xl rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Создать лид
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Первичная задача контакта будет создана автоматически.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
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
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Название
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register('title')}
              />
              {errors.title ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.title.message}
                </span>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Источник
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                placeholder="Сайт, звонок, рекомендация"
                {...register('source')}
              />
              {errors.source ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.source.message}
                </span>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Ответственный
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                placeholder="UUID менеджера"
                {...register('ownerId')}
              />
              {errors.ownerId ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.ownerId.message}
                </span>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Телефон
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                placeholder="+7 999 111-22-33"
                {...register('phone')}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </span>
              <input
                type="email"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register('email')}
              />
              {errors.email ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.email.message}
                </span>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                ИНН
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register('inn')}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                ФИО контакта
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register('contactName')}
              />
            </label>
          </div>

          {duplicatesQuery.isFetching ? (
            <p className="text-sm text-slate-600">Проверка дублей...</p>
          ) : null}

          {duplicates.length > 0 ? (
            <div className="rounded border border-yellow-300 bg-yellow-50 p-3">
              <div className="text-sm font-semibold text-yellow-900">
                Найдены похожие клиенты в базе:
              </div>
              <div className="mt-2 divide-y divide-yellow-200">
                {duplicates.map((duplicate) => (
                  <div
                    key={duplicate.client.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-950">
                        {duplicate.client.name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-700">
                        {formatReasons(duplicate.reasons)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDuplicate(duplicate)}
                      className="shrink-0 rounded border border-yellow-400 bg-white px-2 py-1 text-xs font-medium text-yellow-900 hover:bg-yellow-100"
                    >
                      Привязать к существующему
                    </button>
                  </div>
                ))}
              </div>
              {selectedDuplicate ? (
                <div className="mt-2 text-xs font-medium text-yellow-950">
                  Выбран клиент: {selectedDuplicate.client.name}
                </div>
              ) : null}
            </div>
          ) : null}

          {createLead.isError ? (
            <p className="text-sm text-red-600">Не удалось создать лид.</p>
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
              disabled={!isValid || createLead.isPending}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
            >
              Создать лид
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
