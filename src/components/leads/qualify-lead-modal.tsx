'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useClient, useClients } from '../../hooks/use-clients';
import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { Lead, useQualifyLead } from '../../hooks/use-leads';
import { usePanelSizes, usePanelTypes } from '../../hooks/use-panels';
import { apiClient } from '../../lib/api-client';
import {
  displayContactValue,
  resolveClientContactPresentation,
} from '../../lib/client-contact';
import { formatContactName } from '../../lib/display-names';
import { getErrorMessage } from '../../lib/errors';
import {
  CUSTOM_SIZE_PRICING_NOTE,
  findPanelTypeIdByApplication,
  isValidThicknessForApplication,
  panelSizeLabel,
  toDecimalNumber,
} from '../../lib/hpl-domain';
import { HplApplicationField } from './hpl-application-field';
import { HplThicknessField } from './hpl-thickness-field';
import {
  InstallationRequiredField,
  installationSelectionToBoolean,
} from './installation-required-field';
import {
  QualifyLeadFormInput,
  QualifyLeadFormValues,
  buildQualifyLeadPayload,
  defaultApplicationFromQualification,
  defaultContactMode,
  defaultObjectMode,
  defaultSizeModeFromQualification,
  qualifyLeadSchema,
} from './qualify-lead-form';
import { SearchCombobox } from '../ui/search-combobox';

type ProjectObjectResponse = { id: string };
type ContactResponse = { id: string };

type QualifyLeadModalProps = {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
};

function FieldError({ message }: { message?: string }) {
  return message ? <span className="mt-1 block text-sm text-red-600">{message}</span> : null;
}

function RequiredMark() {
  return <span className="text-red-600"> *</span>;
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
  const submitLockRef = useRef(false);
  const previousClientIdRef = useRef(lead.clientId ?? '');
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
    formState: { errors, isSubmitted, isValid },
  } = useForm<QualifyLeadFormInput, unknown, QualifyLeadFormValues>({
    resolver: zodResolver(qualifyLeadSchema),
    mode: 'onChange',
    defaultValues: {
      clientId: lead.clientId ?? '',
      objectMode: defaultObjectMode(lead.projectObjectId),
      projectObjectId: lead.projectObjectId ?? '',
      newObjectName: '',
      contactMode: defaultContactMode(lead.contactId),
      contactId: lead.contactId ?? '',
      contactFirstName: '',
      contactLastName: '',
      contactPhone: '',
      contactEmail: '',
      needDescription: lead.needDescription ?? '',
      decisionMakerContact: lead.decisionMakerContact ?? '',
      application: defaultApplicationFromQualification(
        lead.qualification?.application,
        lead.qualification?.panelType?.code,
      ),
      panelTypeId: lead.qualification?.panelTypeId ?? '',
      thicknessMm: toDecimalNumber(lead.qualification?.thicknessMm) ?? '',
      sizeMode: defaultSizeModeFromQualification(lead.qualification),
      panelSizeId: lead.qualification?.panelSizeId ?? '',
      customWidthMm: toDecimalNumber(lead.qualification?.customWidthMm) ?? '',
      customHeightMm: toDecimalNumber(lead.qualification?.customHeightMm) ?? '',
      colorCode: lead.qualification?.colorCode ?? '',
      colorName: lead.qualification?.colorName ?? '',
      requiredAreaM2: (() => {
        const area = toDecimalNumber(lead.qualification?.requiredAreaM2);
        return area !== null && area > 0 ? area : '';
      })(),
      installationRequired:
        lead.qualification?.installationRequired === true
          ? 'yes'
          : lead.qualification?.installationRequired === false
            ? 'no'
            : undefined,
      urgent: lead.qualification?.urgent ?? false,
      willingToWait: lead.qualification?.willingToWait ?? false,
    },
  });

  const selectedClientId = useWatch({ control, name: 'clientId' });
  const selectedApplication = useWatch({ control, name: 'application' });
  const selectedSizeMode = useWatch({ control, name: 'sizeMode' });
  const selectedThickness = useWatch({ control, name: 'thicknessMm' });
  const objectMode = useWatch({ control, name: 'objectMode' });
  const contactMode = useWatch({ control, name: 'contactMode' });
  const selectedContactId = useWatch({ control, name: 'contactId' });
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

  const contacts = clientDetailsQuery.data?.contacts ?? [];
  const contactOptions = (() => {
    const items = contacts.map((contact) => ({
      value: contact.id,
      label: formatContactName(contact),
      description: [contact.position, contact.phone, contact.email].filter(Boolean).join(' · '),
    }));
    if (lead?.contact && !items.some((item) => item.value === lead.contact?.id)) {
      return [{ value: lead.contact.id, label: formatContactName(lead.contact) }, ...items];
    }
    return items;
  })();

  const selectedContact =
    contacts.find((contact) => contact.id === selectedContactId) ??
    (lead.contact?.id === selectedContactId ? lead.contact : null);
  const selectedClient = clientDetailsQuery.data ?? lead.client ?? null;
  const selectedContactPresentation = resolveClientContactPresentation({
    client: selectedClient
      ? {
          name: selectedClient.name,
          phone: selectedClient.phone,
          email: selectedClient.email,
        }
      : null,
    contact: selectedContact,
  });

  const panelSizeOptions = (panelSizesQuery.data ?? []).map((size) => ({
    value: size.id,
    label: panelSizeLabel(size),
    description: size.areaM2 ? `${size.areaM2} м2` : undefined,
  }));

  useEffect(() => {
    if (selectedClientId === previousClientIdRef.current) {
      return;
    }
    previousClientIdRef.current = selectedClientId ?? '';
    setValue('projectObjectId', '');
    setValue('contactId', '');
    setValue('objectMode', 'EXISTING', { shouldValidate: true });
    setValue('contactMode', 'EXISTING', { shouldValidate: true });
  }, [selectedClientId, setValue]);

  const onSubmit = async (values: QualifyLeadFormValues): Promise<void> => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setFormError(null);
    setIsSubmitting(true);

    try {
      let projectObjectId =
        values.objectMode === 'EXISTING' ? values.projectObjectId : undefined;
      let contactId = values.contactMode === 'EXISTING' ? values.contactId : undefined;

      if (values.objectMode === 'NEW' && values.newObjectName) {
        const objectResponse = await apiClient.post<ProjectObjectResponse>(
          `/clients/${values.clientId}/objects`,
          { name: values.newObjectName },
        );
        projectObjectId = objectResponse.data.id;
      }

      if (!projectObjectId) {
        setFormError('Не удалось определить объект проекта.');
        return;
      }

      if (values.contactMode === 'NEW' && values.contactFirstName) {
        const contactResponse = await apiClient.post<ContactResponse>(
          `/clients/${values.clientId}/contacts`,
          {
            firstName: values.contactFirstName,
            ...(values.contactLastName ? { lastName: values.contactLastName } : {}),
            ...(values.contactPhone?.trim() ? { phone: values.contactPhone.trim() } : {}),
            ...(values.contactEmail?.trim() ? { email: values.contactEmail.trim() } : {}),
            isPrimary: true,
          },
        );
        contactId = contactResponse.data.id;
      }

      if (!contactId) {
        setFormError('Не удалось определить контакт.');
        return;
      }

      const panelTypeId = findPanelTypeIdByApplication(
        panelTypesQuery.data ?? [],
        values.application,
      );
      if (!panelTypeId) {
        setFormError('Не удалось определить тип панели.');
        return;
      }

      await qualifyLead.mutateAsync(
        buildQualifyLeadPayload({
          leadId: lead.id,
          clientId: values.clientId,
          contactId,
          projectObjectId,
          values: { ...values, panelTypeId },
          panelTypeId,
          installationRequired: installationSelectionToBoolean(
            values.installationRequired,
          ),
        }),
      );

      reset();
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Не удалось квалифицировать лид.'));
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting || qualifyLead.isPending;

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
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Клиент
                <RequiredMark />
              </span>
              <Controller name="clientId" control={control} render={({ field }) => (
                <SearchCombobox value={field.value ?? ''} onChange={field.onChange} options={clientOptions} placeholder="Выберите клиента" searchPlaceholder="Поиск клиента" emptyLabel="Клиенты не найдены" loading={clientsQuery.isFetching} onSearchChange={setClientSearch} />
              )} />
              <FieldError message={errors.clientId?.message} />
            </label>

            <fieldset className="md:col-span-2">
              <legend className="mb-1 block text-sm font-medium text-slate-700">
                Объект
                <RequiredMark />
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    value="EXISTING"
                    checked={objectMode === 'EXISTING'}
                    onChange={() => {
                      setValue('objectMode', 'EXISTING', { shouldValidate: true });
                      setValue('newObjectName', '');
                    }}
                  />
                  Существующий объект
                </label>
                <label className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    value="NEW"
                    checked={objectMode === 'NEW'}
                    onChange={() => {
                      setValue('objectMode', 'NEW', { shouldValidate: true });
                      setValue('projectObjectId', '');
                    }}
                  />
                  Новый объект
                </label>
              </div>
              {objectMode === 'EXISTING' ? (
                <div className="mt-3">
                  <Controller name="projectObjectId" control={control} render={({ field }) => (
                    <SearchCombobox value={field.value ?? ''} onChange={field.onChange} options={projectObjectOptions} placeholder="Выберите объект" searchPlaceholder="Поиск объекта" emptyLabel="Объекты не найдены" disabled={!selectedClientId} loading={clientDetailsQuery.isFetching} />
                  )} />
                  <FieldError message={errors.projectObjectId?.message} />
                </div>
              ) : (
                <label className="mt-3 block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Название нового объекта</span>
                  <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500" {...register('newObjectName')} />
                  <FieldError message={errors.newObjectName?.message} />
                </label>
              )}
            </fieldset>

            <fieldset className="md:col-span-2">
              <legend className="mb-1 block text-sm font-medium text-slate-700">
                Контакт
                <RequiredMark />
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    value="EXISTING"
                    checked={contactMode === 'EXISTING'}
                    onChange={() => {
                      setValue('contactMode', 'EXISTING', { shouldValidate: true });
                      setValue('contactFirstName', '');
                      setValue('contactLastName', '');
                      setValue('contactPhone', '');
                      setValue('contactEmail', '');
                    }}
                  />
                  Существующий контакт
                </label>
                <label className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    value="NEW"
                    checked={contactMode === 'NEW'}
                    onChange={() => {
                      setValue('contactMode', 'NEW', { shouldValidate: true });
                      setValue('contactId', '');
                    }}
                  />
                  Новый контакт
                </label>
              </div>
              {contactMode === 'EXISTING' ? (
                <div className="mt-3 space-y-3">
                  <Controller name="contactId" control={control} render={({ field }) => (
                    <SearchCombobox value={field.value ?? ''} onChange={field.onChange} options={contactOptions} placeholder="Выберите контакт" searchPlaceholder="Поиск контакта" emptyLabel="Контакты не найдены" disabled={!selectedClientId} loading={clientDetailsQuery.isFetching} />
                  )} />
                  <FieldError message={errors.contactId?.message} />
                  <dl className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs uppercase text-slate-500">Контакт</dt>
                      <dd className="mt-1 text-slate-900">
                        {displayContactValue(selectedContactPresentation.contactName)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-slate-500">Телефон</dt>
                      <dd className="mt-1 text-slate-900">
                        {displayContactValue(selectedContactPresentation.phone)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-slate-500">Email</dt>
                      <dd className="mt-1 text-slate-900">
                        {displayContactValue(selectedContactPresentation.email)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-sm font-medium text-slate-700">Имя контакта</span>
                    <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" {...register('contactFirstName')} />
                    <FieldError message={errors.contactFirstName?.message} />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium text-slate-700">Фамилия контакта</span>
                    <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" {...register('contactLastName')} />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium text-slate-700">Телефон контакта</span>
                    <input type="tel" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" {...register('contactPhone')} />
                    <FieldError message={errors.contactPhone?.message} />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium text-slate-700">Email контакта</span>
                    <input type="email" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" {...register('contactEmail')} />
                    <FieldError message={errors.contactEmail?.message} />
                  </label>
                </div>
              )}
            </fieldset>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                ЛПР / лицо, принимающее решение
                <RequiredMark />
              </span>
              <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500" {...register('decisionMakerContact')} />
              <FieldError message={errors.decisionMakerContact?.message} />
            </label>

            <Controller
              name="application"
              control={control}
              render={({ field }) => (
                <HplApplicationField
                  value={field.value}
                  onChange={(nextApplication) => {
                    field.onChange(nextApplication);
                    if (
                      selectedThickness !== '' &&
                      selectedThickness !== undefined &&
                      !isValidThicknessForApplication(
                        nextApplication,
                        selectedThickness,
                      )
                    ) {
                      setValue('thicknessMm', '', { shouldValidate: true });
                    }
                  }}
                  error={errors.application?.message}
                />
              )}
            />
            {errors.panelTypeId?.message ? (
              <FieldError message={errors.panelTypeId.message} />
            ) : null}

            <Controller
              name="thicknessMm"
              control={control}
              render={({ field }) => (
                <HplThicknessField
                  application={selectedApplication}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.thicknessMm?.message}
                />
              )}
            />

            <fieldset className="md:col-span-2">
              <legend className="mb-1 block text-sm font-medium text-slate-700">
                Размер
                <RequiredMark />
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    value="STANDARD"
                    checked={selectedSizeMode === 'STANDARD'}
                    onChange={() => {
                      setValue('sizeMode', 'STANDARD', { shouldValidate: true });
                      setValue('customWidthMm', '');
                      setValue('customHeightMm', '');
                    }}
                  />
                  Стандартный размер
                </label>
                <label className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    value="CUSTOM"
                    checked={selectedSizeMode === 'CUSTOM'}
                    onChange={() => {
                      setValue('sizeMode', 'CUSTOM', { shouldValidate: true });
                      setValue('panelSizeId', '');
                    }}
                  />
                  Нестандартный размер
                </label>
              </div>
              {selectedSizeMode === 'STANDARD' ? (
                <div className="mt-3">
                  <Controller name="panelSizeId" control={control} render={({ field }) => (
                    <SearchCombobox value={field.value ?? ''} onChange={field.onChange} options={panelSizeOptions} placeholder="Выберите стандартный размер" searchPlaceholder="Поиск размера" emptyLabel="Размеры не найдены" loading={panelSizesQuery.isFetching} />
                  )} />
                  <FieldError message={errors.panelSizeId?.message} />
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-sm font-medium text-slate-700">Ширина, мм</span>
                    <input type="number" min="1" step="1" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" {...register('customWidthMm')} />
                    <FieldError message={errors.customWidthMm?.message} />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium text-slate-700">Высота, мм</span>
                    <input type="number" min="1" step="1" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" {...register('customHeightMm')} />
                    <FieldError message={errors.customHeightMm?.message} />
                  </label>
                  <p className="text-sm text-amber-700 sm:col-span-2">{CUSTOM_SIZE_PRICING_NOTE}</p>
                </div>
              )}
            </fieldset>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Цвет / код
                <RequiredMark />
              </span>
              <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="RAL-9005" {...register('colorCode')} />
              <FieldError message={errors.colorCode?.message} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Название цвета</span>
              <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" {...register('colorName')} />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Площадь, м2
                <RequiredMark />
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Например, 24"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                {...register('requiredAreaM2')}
              />
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
              <input type="checkbox" {...register('urgent')} />
              Срочно
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register('willingToWait')} />
              Готов ждать
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Потребность
                <RequiredMark />
              </span>
              <textarea rows={4} className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500" {...register('needDescription')} />
              <FieldError message={errors.needDescription?.message} />
            </label>
          </div>

          {isSubmitted && !isValid ? (
            <p className="mt-4 text-sm text-red-600">
              Заполните обязательные поля, отмеченные *.
            </p>
          ) : null}
          {formError ? <p className="mt-4 text-sm text-red-600">{formError}</p> : null}

          <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Отмена
            </button>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:opacity-60">
              {busy ? 'Сохранение...' : 'Квалифицировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
