'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useClient, useClients } from '../../hooks/use-clients';
import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { Lead, useQualifyLead } from '../../hooks/use-leads';
import { usePanelSizes, usePanelTypes } from '../../hooks/use-panels';
import { apiClient } from '../../lib/api-client';
import { formatContactName } from '../../lib/display-names';
import {
  InstallationRequiredField,
  installationSelectionToBoolean,
} from './installation-required-field';
import { MoneyInput } from '../ui/money-input';
import { SearchCombobox } from '../ui/search-combobox';

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
    needDescription: z.string().trim().min(5, 'Опишите потребность'),
    estimatedAmount: z.coerce.number().positive('Сумма должна быть больше 0'),
    estimatedAmountCurrency: z.enum(['USD', 'UZS']),
    targetDate: z.string().trim().min(1, 'Укажите срок реализации'),
    decisionMakerContact: z.string().trim().min(1, 'Укажите ЛПР'),
    application: z.enum(['INTERIOR', 'EXTERIOR']),
    panelTypeId: z.string().trim().uuid('Выберите тип панели'),
    thicknessMm: z.coerce.number().int().positive('Укажите толщину'),
    panelSizeId: z.string().trim().uuid('Выберите размер'),
    colorCode: z.string().trim().min(1, 'Укажите цвет'),
    colorName: z.string().trim().optional(),
    requiredAreaM2: z.coerce.number().positive('Площадь должна быть больше 0'),
    installationRequired: z.enum(['yes', 'no'], {
      message: 'Укажите монтаж',
    }),
    stockOnly: z.boolean(),
    urgent: z.boolean(),
    willingToWait: z.boolean(),
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

type ProjectObjectResponse = { id: string };
type ContactResponse = { id: string };

type QualifyLeadModalProps = {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
};

function splitPersonName(fullName: string): { firstName: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? fullName.trim(),
    lastName: parts.slice(1).join(' ') || undefined,
  };
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="mt-1 block text-sm text-red-600">{message}</span> : null;
}

export function QualifyLeadModal({ lead, isOpen, onClose }: QualifyLeadModalProps) {
  if (!isOpen || !lead) {
    return null;
  }

  return (
    <QualifyLeadModalContent key={lead.id} lead={lead} onClose={onClose} />
  );
}

function QualifyLeadModalContent({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  const qualifyLead = useQualifyLead();
  const panelTypesQuery = usePanelTypes();
  const panelSizesQuery = usePanelSizes();
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
    setValue,
    formState: { errors, isValid },
  } = useForm<QualifyLeadFormInput, unknown, QualifyLeadFormValues>({
    resolver: zodResolver(qualifyLeadSchema),
    mode: 'onChange',
    defaultValues: {
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
      application: 'INTERIOR',
      panelTypeId: '',
      thicknessMm: 0,
      panelSizeId: '',
      colorCode: '',
      colorName: '',
      requiredAreaM2: 0,
      installationRequired: undefined,
      stockOnly: false,
      urgent: false,
      willingToWait: false,
    },
  });

  const selectedClientId = useWatch({ control, name: 'clientId' });
  const clientDetailsQuery = useClient(selectedClientId || null);

  const clientOptions = (() => {
    const items = (clientsQuery.data?.items ?? []).map((client) => ({
      value: client.id,
      label: client.name,
      description: [client.inn, client.phone, client.email].filter(Boolean).join(' · '),
    }));
    if (lead?.client && !items.some((item) => item.value === lead.client?.id)) {
      return [{ value: lead.client.id, label: lead.client.name }, ...items];
    }
    return items;
  })();

  const projectObjectOptions = (() => {
    const items = (clientDetailsQuery.data?.projectObjects ?? [])
      .filter((object) => object.stage !== 'ARCHIVED')
      .map((object) => ({
        value: object.id,
        label: object.name,
        description: object.address ?? undefined,
      }));
    if (lead?.projectObject && !items.some((item) => item.value === lead.projectObject?.id)) {
      return [{ value: lead.projectObject.id, label: lead.projectObject.name }, ...items];
    }
    return items;
  })();

  const contactOptions = (() => {
    const items = (clientDetailsQuery.data?.contacts ?? []).map((contact) => ({
      value: contact.id,
      label: formatContactName(contact),
      description: [contact.position, contact.phone, contact.email].filter(Boolean).join(' · '),
    }));
    if (lead?.contact && !items.some((item) => item.value === lead.contact?.id)) {
      return [{ value: lead.contact.id, label: formatContactName(lead.contact) }, ...items];
    }
    return items;
  })();

  const panelTypeOptions = (panelTypesQuery.data ?? []).map((type) => ({
    value: type.id,
    label: type.name || type.code,
    description: type.code,
  }));

  const panelSizeOptions = (panelSizesQuery.data ?? []).map((size) => ({
    value: size.id,
    label: size.label ?? `${size.width} x ${size.length} мм`,
    description: size.areaM2 ? `${size.areaM2} м2` : undefined,
  }));

  useEffect(() => {
    setValue('projectObjectId', '');
    setValue('contactId', '');
  }, [selectedClientId, setValue]);

  const onSubmit = async (values: QualifyLeadFormValues): Promise<void> => {
    if (submitLockRef.current) return;
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
            { name: values.newObjectName },
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
        qualification: {
          application: values.application,
          panelTypeId: values.panelTypeId,
          thicknessMm: values.thicknessMm,
          panelSizeId: values.panelSizeId,
          colorCode: values.colorCode,
          colorName: values.colorName || null,
          requiredAreaM2: values.requiredAreaM2,
          installationRequired: installationSelectionToBoolean(
            values.installationRequired,
          ),
          stockOnly: values.stockOnly,
          urgent: values.urgent,
          willingToWait: values.willingToWait,
          customerRequirements: values.needDescription,
        },
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

  const busy = isSubmitting || isCreatingObject || qualifyLead.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Квалифицировать лид</h2>
            <p className="mt-1 text-sm text-slate-600">{lead.title}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
            Закрыть
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Клиент</span>
              <Controller name="clientId" control={control} render={({ field }) => (
                <SearchCombobox value={field.value ?? ''} onChange={field.onChange} options={clientOptions} placeholder="Выберите клиента" searchPlaceholder="Поиск клиента" emptyLabel="Клиенты не найдены" loading={clientsQuery.isFetching} onSearchChange={setClientSearch} />
              )} />
              <FieldError message={errors.clientId?.message} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Объект</span>
              <Controller name="projectObjectId" control={control} render={({ field }) => (
                <SearchCombobox value={field.value ?? ''} onChange={field.onChange} options={projectObjectOptions} placeholder="Выберите объект" searchPlaceholder="Поиск объекта" emptyLabel="Объекты не найдены" disabled={!selectedClientId} loading={clientDetailsQuery.isFetching} />
              )} />
              <FieldError message={errors.projectObjectId?.message} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Новый объект</span>
              <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500" {...register('newObjectName')} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Контакт</span>
              <Controller name="contactId" control={control} render={({ field }) => (
                <SearchCombobox value={field.value ?? ''} onChange={field.onChange} options={contactOptions} placeholder="Выберите контакт" searchPlaceholder="Поиск контакта" emptyLabel="Контакты не найдены" disabled={!selectedClientId} loading={clientDetailsQuery.isFetching} />
              )} />
              <FieldError message={errors.contactId?.message} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Данные контакта</span>
              <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500" {...register('contactName')} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Срок реализации</span>
              <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500" {...register('targetDate')} />
              <FieldError message={errors.targetDate?.message} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Оценка суммы</span>
              <Controller name="estimatedAmount" control={control} render={({ field: amountField }) => (
                <Controller name="estimatedAmountCurrency" control={control} render={({ field: currencyField }) => (
                  <MoneyInput value={amountField.value ? String(amountField.value) : ''} currency={currencyField.value} onValueChange={(nextValue) => amountField.onChange(nextValue === '' ? '' : Number(nextValue))} onCurrencyChange={currencyField.onChange} />
                )} />
              )} />
              <FieldError message={errors.estimatedAmount?.message} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">ЛПР</span>
              <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500" {...register('decisionMakerContact')} />
              <FieldError message={errors.decisionMakerContact?.message} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Применение</span>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" {...register('application')}>
                <option value="INTERIOR">Интерьер</option>
                <option value="EXTERIOR">Экстерьер</option>
              </select>
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Тип панели</span>
              <Controller name="panelTypeId" control={control} render={({ field }) => (
                <SearchCombobox value={field.value ?? ''} onChange={field.onChange} options={panelTypeOptions} placeholder="Выберите тип" searchPlaceholder="Поиск типа" emptyLabel="Типы не найдены" loading={panelTypesQuery.isFetching} />
              )} />
              <FieldError message={errors.panelTypeId?.message} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Толщина, мм</span>
              <input type="number" min="1" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" {...register('thicknessMm')} />
              <FieldError message={errors.thicknessMm?.message} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Размер</span>
              <Controller name="panelSizeId" control={control} render={({ field }) => (
                <SearchCombobox value={field.value ?? ''} onChange={field.onChange} options={panelSizeOptions} placeholder="Выберите размер" searchPlaceholder="Поиск размера" emptyLabel="Размеры не найдены" loading={panelSizesQuery.isFetching} />
              )} />
              <FieldError message={errors.panelSizeId?.message} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Цвет / код</span>
              <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="RAL-9005" {...register('colorCode')} />
              <FieldError message={errors.colorCode?.message} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Название цвета</span>
              <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" {...register('colorName')} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Площадь, м2</span>
              <input type="number" min="0" step="0.01" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" {...register('requiredAreaM2')} />
              <FieldError message={errors.requiredAreaM2?.message} />
            </label>

            <Controller
              name="installationRequired"
              control={control}
              render={({ field }) => (
                <InstallationRequiredField
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.installationRequired?.message}
                />
              )}
            />

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register('stockOnly')} />
              Только склад
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register('urgent')} />
              Срочно
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register('willingToWait')} />
              Готов ждать
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Потребность</span>
              <textarea rows={4} className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500" {...register('needDescription')} />
              <FieldError message={errors.needDescription?.message} />
            </label>
          </div>

          {formError ? <p className="mt-4 text-sm text-red-600">{formError}</p> : null}

          <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Отмена
            </button>
            <button type="submit" disabled={!isValid || busy} className="inline-flex items-center gap-2 rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:opacity-60">
              {busy ? 'Сохранение...' : 'Квалифицировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
