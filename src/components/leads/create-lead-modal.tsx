'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { SearchCombobox } from '../ui/search-combobox';
import { useAuth } from '../../context/auth-context';
import { Contact, useCreateClient } from '../../hooks/use-clients';
import {
  DuplicateMatch,
  useCheckDuplicates,
  useCreateLead,
} from '../../hooks/use-leads';
import { useUsersList } from '../../hooks/use-users';
import { apiClient } from '../../lib/api-client';
import { formatPersonName } from '../../lib/display-names';
import { optionalInnSchema } from '../../lib/validations/inn';
import { optionalPhoneSchema } from '../../lib/validations/phone';
import { getErrorMessage } from '../../lib/errors';
import { isHeadOrAbove, isManagerOnly } from '../../lib/role-access';

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || z.string().uuid().safeParse(value).success, {
    message: 'Выберите сотрудника из списка',
  });

const createLeadSchema = z.object({
  title: z.string().trim().min(3, 'Укажите название лида'),
  source: z.string().trim().min(2, 'Укажите источник'),
  ownerId: optionalUuid,
  phone: optionalPhoneSchema,
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Некорректный email',
    }),
  inn: optionalInnSchema,
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

function splitPersonName(
  fullName: string,
): { firstName: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? fullName.trim();
  const lastName = parts.slice(1).join(' ') || undefined;

  return { firstName, lastName };
}

function optionalText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function CreateLeadModal({ isOpen, onClose }: CreateLeadModalProps) {
  const { user } = useAuth();
  const hideOwnerField = isManagerOnly(user);
  const canAssignOwner = isHeadOrAbove(user);
  const { users } = useUsersList();
  const createLead = useCreateLead();
  const createClient = useCreateClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateQuery, setDuplicateQuery] = useState('');
  const [selectedDuplicate, setSelectedDuplicate] =
    useState<DuplicateMatch | null>(null);
  const ownerOptions = useMemo(
    () =>
      users.map((item) => ({
        value: item.id,
        label: formatPersonName(item, item.email),
        description: item.email,
      })),
    [users],
  );
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
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
      setFormError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, reset, user?.id]);

  if (!isOpen) {
    return null;
  }

  const onSubmit = async (values: CreateLeadFormValues): Promise<void> => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const phone = optionalText(values.phone);
      const email = optionalText(values.email);
      const inn = optionalText(values.inn);
      const contactName = optionalText(values.contactName);
      let clientId = selectedDuplicate?.client.id;
      let contactId: string | undefined;

      if (!clientId && (phone || email || inn || contactName)) {
        const createdClient = await createClient.mutateAsync({
          type: inn ? 'COMPANY' : 'INDIVIDUAL',
          name: contactName || values.title,
          inn,
          phone,
          email,
          source: values.source,
          contacts: contactName
            ? [
                {
                  ...splitPersonName(contactName),
                  phone,
                  email,
                  isPrimary: true,
                },
              ]
            : undefined,
        });
        clientId = createdClient.id;
        contactId = createdClient.contacts?.[0]?.id;
      } else if (clientId && contactName) {
        const contactResponse = await apiClient.post<Contact>(
          `/clients/${clientId}/contacts`,
          {
            ...splitPersonName(contactName),
            phone,
            email,
          },
        );
        contactId = contactResponse.data.id;
      }

      await createLead.mutateAsync({
        title: values.title,
        source: values.source,
        ownerId: hideOwnerField ? user?.id : values.ownerId || undefined,
        clientId,
        contactId,
      });

      reset();
      setSelectedDuplicate(null);
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Не удалось создать лид.'));
    } finally {
      setIsSubmitting(false);
    }
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

            {canAssignOwner ? (
              <label>
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Ответственный
                </span>
                <Controller
                  name="ownerId"
                  control={control}
                  render={({ field }) => (
                    <SearchCombobox
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={ownerOptions}
                      placeholder="Выберите сотрудника"
                      searchPlaceholder="Поиск по имени или email"
                      emptyLabel="Сотрудники не найдены"
                    />
                  )}
                />
                {errors.ownerId ? (
                  <span className="mt-1 block text-sm text-red-600">
                    {errors.ownerId.message}
                  </span>
                ) : null}
              </label>
            ) : null}

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Телефон
              </span>
              <input
                type="tel"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                placeholder="+7 999 111-22-33"
                {...register('phone')}
              />
              {errors.phone ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.phone.message}
                </span>
              ) : null}
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
              {errors.inn ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.inn.message}
                </span>
              ) : null}
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

          {formError ? (
            <p className="text-sm text-red-600">{formError}</p>
          ) : null}

          {createLead.isError && !formError ? (
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
              disabled={!isValid || isSubmitting || createLead.isPending}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
            >
              {isSubmitting ? 'Создание...' : 'Создать лид'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
