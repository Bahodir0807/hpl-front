'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { SearchCombobox } from '../ui/search-combobox';
import { MoneyInput } from '../ui/money-input';
import { apiClient } from '../../lib/api-client';
import { useClient, useClients } from '../../hooks/use-clients';
import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { Lead, useQualifyLead } from '../../hooks/use-leads';
import { formatContactName } from '../../lib/display-names';

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || z.string().uuid().safeParse(value).success, {
    message: 'Выберите значение из списка',
  });

const qualifyLeadSchema = z
  .object({
    clientId: z.string().trim().uuid('Выберите клиента'),
    projectObjectId: optionalUuid,
    newObjectName: z.string().trim().optional(),
    contactId: optionalUuid,
    contactName: z.string().trim().optional(),
    needDescription: z
      .string()
      .trim()
      .min(5, 'Потребность должна быть не короче 5 символов'),
    estimatedAmount: z.coerce.number().positive('Сумма должна быть больше 0'),
    estimatedAmountCurrency: z.enum(['USD', 'UZS']),
    targetDate: z.string().trim().min(1, 'Укажите срок реализации'),
    decisionMakerContact: z.string().trim().min(1, 'Укажите ЛПР'),
  })
  .refine((value) => Boolean(value.projectObjectId || value.newObjectName), {
    message: 'Выберите объект или укажите название нового',
    path: ['projectObjectId'],
  })
  .refine((value) => Boolean(value.contactId || value.contactName), {
    message: 'Выберите контакт или укажите данные контакта',
    path: ['contactId'],
  });

type QualifyLeadFormValues = z.infer<typeof qualifyLeadSchema>;
type QualifyLeadFormInput = z.input<typeof qualifyLeadSchema>;

type ProjectObjectResponse = {
  id: string;
};

type ContactResponse = {
  id: string;
};

function splitPersonName(
  fullName: string,
): { firstName: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? fullName.trim();
  const lastName = parts.slice(1).join(' ') || undefined;

  return { firstName, lastName };
}

type QualifyLeadModalProps = {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
};

export function QualifyLeadModal({
  lead,
  isOpen,
  onClose,
}: QualifyLeadModalProps) {
  const qualifyLead = useQualifyLead();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingObject, setIsCreatingObject] = useState(false);
  const submitLockRef = useRef(false);
  const [clientSearch, setClientSearch] = useState('');
  const debouncedClientSearch = useDebouncedValue(clientSearch, 300);
  const clientsQuery = useClients({
    search: debouncedClientSearch.trim() || undefined,
    limit: 50,
  });
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<QualifyLeadFormInput, unknown, QualifyLeadFormValues>({
    resolver: zodResolver(qualifyLeadSchema),
    mode: 'onChange',
    defaultValues: {
      clientId: '',
      projectObjectId: '',
      newObjectName: '',
      contactId: '',
      contactName: '',
      needDescription: '',
      estimatedAmount: 0,
      estimatedAmountCurrency: 'UZS',
      targetDate: '',
      decisionMakerContact: '',
    },
  });
  const selectedClientId = watch('clientId');
  const clientDetailsQuery = useClient(
    typeof selectedClientId === 'string' && selectedClientId
      ? selectedClientId
      : null,
  );

  const clientOptions = useMemo(() => {
    const items = (clientsQuery.data?.items ?? []).map((client) => ({
      value: client.id,
      label: client.name,
      description: [client.inn, client.phone, client.email]
        .filter(Boolean)
        .join(' · '),
    }));

    if (lead?.client && !items.some((item) => item.value === lead.client?.id)) {
      return [
        {
          value: lead.client.id,
          label: lead.client.name,
        },
        ...items,
      ];
    }

    return items;
  }, [clientsQuery.data?.items, lead?.client]);

  const projectObjectOptions = useMemo(() => {
    const items = (clientDetailsQuery.data?.projectObjects ?? [])
      .filter((object) => object.stage !== 'ARCHIVED')
      .map((object) => ({
        value: object.id,
        label: object.name,
        description: object.address ?? undefined,
      }));

    if (
      lead?.projectObject &&
      !items.some((item) => item.value === lead.projectObject?.id)
    ) {
      return [
        {
          value: lead.projectObject.id,
          label: lead.projectObject.name,
        },
        ...items,
      ];
    }

    return items;
  }, [clientDetailsQuery.data?.projectObjects, lead?.projectObject]);

  const contactOptions = useMemo(() => {
    const items = (clientDetailsQuery.data?.contacts ?? []).map((contact) => ({
      value: contact.id,
      label: formatContactName(contact),
      description: [contact.position, contact.phone, contact.email]
        .filter(Boolean)
        .join(' · '),
    }));

    if (lead?.contact && !items.some((item) => item.value === lead.contact?.id)) {
      return [
        {
          value: lead.contact.id,
          label: formatContactName(lead.contact),
        },
        ...items,
      ];
    }

    return items;
  }, [clientDetailsQuery.data?.contacts, lead?.contact]);

  useEffect(() => {
    if (isOpen && lead) {
      reset({
        clientId: lead.clientId ?? '',
        projectObjectId: lead.projectObjectId ?? '',
        newObjectName: '',
        contactId: lead.contactId ?? '',
        contactName: '',
        needDescription: lead.needDescription ?? '',
        estimatedAmount: Number(lead.estimatedAmount ?? 0),
        estimatedAmountCurrency: 'UZS',
        targetDate: lead.targetDate ? lead.targetDate.slice(0, 10) : '',
        decisionMakerContact: lead.decisionMakerContact ?? '',
      });
      setClientSearch('');
      setFormError(null);
      setIsSubmitting(false);
      setIsCreatingObject(false);
      submitLockRef.current = false;
    }
  }, [isOpen, lead, reset]);

  useEffect(() => {
    setValue('projectObjectId', '');
    setValue('contactId', '');
  }, [selectedClientId, setValue]);

  if (!isOpen || !lead) {
    return null;
  }

  const onSubmit = async (values: QualifyLeadFormValues): Promise<void> => {
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setFormError(null);
    setIsSubmitting(true);

    try {
      let projectObjectId = values.projectObjectId;
      let contactId = values.contactId || undefined;

      if (!projectObjectId && values.newObjectName) {
        setIsCreatingObject(true);
        try {
          const objectResponse = await apiClient.post<ProjectObjectResponse>(
            `/clients/${values.clientId}/objects`,
            {
              name: values.newObjectName,
            },
          );
          projectObjectId = objectResponse.data.id;
        } finally {
          setIsCreatingObject(false);
        }
      }

      if (!projectObjectId) {
        setFormError('Не удалось определить объект проекта.');
        return;
      }

      if (!contactId && values.contactName) {
        const contactResponse = await apiClient.post<ContactResponse>(
          `/clients/${values.clientId}/contacts`,
          splitPersonName(values.contactName),
        );
        contactId = contactResponse.data.id;
      }

      // QualifyLeadDto does not accept contactId; UpdateLeadDto does.
      if (contactId) {
        await apiClient.patch(`/leads/${lead.id}`, { contactId });
      }

      await qualifyLead.mutateAsync({
        id: lead.id,
        clientId: values.clientId,
        projectObjectId,
        needDescription: values.needDescription,
        estimatedAmount: values.estimatedAmount,
        targetDate: new Date(values.targetDate).toISOString(),
        decisionMakerContact: values.decisionMakerContact,
      });

      reset();
      onClose();
    } catch {
      setFormError('Не удалось квалифицировать лид.');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-2xl rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Квалифицировать лид
            </h2>
            <p className="mt-1 text-sm text-slate-600">{lead.title}</p>
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
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Клиент
              </span>
              <Controller
                name="clientId"
                control={control}
                render={({ field }) => (
                  <SearchCombobox
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    options={clientOptions}
                    placeholder="Выберите клиента"
                    searchPlaceholder="Поиск по названию, ИНН, телефону"
                    emptyLabel="Клиенты не найдены"
                    loading={clientsQuery.isFetching}
                    onSearchChange={setClientSearch}
                  />
                )}
              />
              {errors.clientId ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.clientId.message}
                </span>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Объект
              </span>
              <Controller
                name="projectObjectId"
                control={control}
                render={({ field }) => (
                  <SearchCombobox
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    options={projectObjectOptions}
                    placeholder={
                      selectedClientId
                        ? 'Выберите объект'
                        : 'Сначала выберите клиента'
                    }
                    searchPlaceholder="Поиск объекта"
                    emptyLabel="Объекты не найдены"
                    disabled={!selectedClientId}
                    loading={clientDetailsQuery.isFetching}
                  />
                )}
              />
              {errors.projectObjectId ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.projectObjectId.message}
                </span>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Новый объект
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                placeholder="Название объекта"
                {...register('newObjectName')}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Контакт
              </span>
              <Controller
                name="contactId"
                control={control}
                render={({ field }) => (
                  <SearchCombobox
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    options={contactOptions}
                    placeholder={
                      selectedClientId
                        ? 'Выберите контакт'
                        : 'Сначала выберите клиента'
                    }
                    searchPlaceholder="Поиск контакта"
                    emptyLabel="Контакты не найдены"
                    disabled={!selectedClientId}
                    loading={clientDetailsQuery.isFetching}
                  />
                )}
              />
              {errors.contactId ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.contactId.message}
                </span>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Данные контакта
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                placeholder="ФИО контакта"
                {...register('contactName')}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Срок реализации
              </span>
              <input
                type="date"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register('targetDate')}
              />
              {errors.targetDate ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.targetDate.message}
                </span>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Оценка суммы
              </span>
              <Controller
                name="estimatedAmount"
                control={control}
                render={({ field: amountField }) => (
                  <Controller
                    name="estimatedAmountCurrency"
                    control={control}
                    render={({ field: currencyField }) => (
                      <MoneyInput
                        value={
                          amountField.value === '' ||
                          amountField.value === undefined
                            ? ''
                            : String(amountField.value)
                        }
                        currency={currencyField.value}
                        onValueChange={(nextValue) =>
                          amountField.onChange(
                            nextValue === '' ? '' : Number(nextValue),
                          )
                        }
                        onCurrencyChange={currencyField.onChange}
                      />
                    )}
                  />
                )}
              />
              {errors.estimatedAmount ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.estimatedAmount.message}
                </span>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                ЛПР
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register('decisionMakerContact')}
              />
              {errors.decisionMakerContact ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.decisionMakerContact.message}
                </span>
              ) : null}
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Потребность
              </span>
              <textarea
                rows={4}
                className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register('needDescription')}
              />
              {errors.needDescription ? (
                <span className="mt-1 block text-sm text-red-600">
                  {errors.needDescription.message}
                </span>
              ) : null}
            </label>
          </div>

          {formError ? (
            <p className="text-sm text-red-600">{formError}</p>
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
              disabled={
                !isValid ||
                isSubmitting ||
                isCreatingObject ||
                qualifyLead.isPending
              }
              className="inline-flex items-center gap-2 rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:opacity-60"
            >
              {isSubmitting || isCreatingObject || qualifyLead.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-white" />
                  Сохранение...
                </>
              ) : (
                'Квалифицировать'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
