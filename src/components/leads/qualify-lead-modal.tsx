'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiClient } from '../../lib/api-client';
import { Lead, useQualifyLead } from '../../hooks/use-leads';

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || z.string().uuid().safeParse(value).success, {
    message: 'Укажите корректный UUID',
  });

const qualifyLeadSchema = z
  .object({
    clientId: z.string().trim().uuid('Укажите UUID клиента'),
    projectObjectId: optionalUuid,
    newObjectName: z.string().trim().optional(),
    contactId: optionalUuid,
    contactName: z.string().trim().optional(),
    needDescription: z
      .string()
      .trim()
      .min(5, 'Потребность должна быть не короче 5 символов'),
    estimatedAmount: z.coerce.number().positive('Сумма должна быть больше 0'),
    targetDate: z.string().trim().min(1, 'Укажите срок реализации'),
    decisionMakerContact: z.string().trim().min(1, 'Укажите ЛПР'),
  })
  .refine((value) => Boolean(value.projectObjectId || value.newObjectName), {
    message: 'Укажите UUID объекта или название нового объекта',
    path: ['projectObjectId'],
  })
  .refine((value) => Boolean(value.contactId || value.contactName), {
    message: 'Укажите контакт или данные контакта',
    path: ['contactId'],
  });

type QualifyLeadFormValues = z.infer<typeof qualifyLeadSchema>;
type QualifyLeadFormInput = z.input<typeof qualifyLeadSchema>;

type ProjectObjectResponse = {
  id: string;
};

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
  const {
    register,
    handleSubmit,
    reset,
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
      targetDate: '',
      decisionMakerContact: '',
    },
  });

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
        targetDate: lead.targetDate ? lead.targetDate.slice(0, 10) : '',
        decisionMakerContact: lead.decisionMakerContact ?? '',
      });
      setFormError(null);
    }
  }, [isOpen, lead, reset]);

  if (!isOpen || !lead) {
    return null;
  }

  const onSubmit = async (values: QualifyLeadFormValues): Promise<void> => {
    setFormError(null);

    try {
      let projectObjectId = values.projectObjectId;

      if (!projectObjectId && values.newObjectName) {
        const objectResponse = await apiClient.post<ProjectObjectResponse>(
          `/clients/${values.clientId}/objects`,
          {
            name: values.newObjectName,
          },
        );
        projectObjectId = objectResponse.data.id;
      }

      if (!projectObjectId) {
        setFormError('Не удалось определить объект проекта.');
        return;
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
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                placeholder="UUID клиента"
                {...register('clientId')}
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
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                placeholder="UUID объекта"
                {...register('projectObjectId')}
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
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                placeholder="UUID контакта"
                {...register('contactId')}
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
              <input
                type="number"
                step="0.01"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register('estimatedAmount')}
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
              disabled={!isValid || qualifyLead.isPending}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-500"
            >
              Квалифицировать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
