'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useClient, useClients } from '../../hooks/use-clients';
import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { Lead, useQualifyLead } from '../../hooks/use-leads';
import { usePanelSizes, usePanelTypes, type PanelSize } from '../../hooks/use-panels';
import { apiClient } from '../../lib/api-client';
import {
  displayContactValue,
  resolveClientContactPresentation,
} from '../../lib/client-contact';
import { formatContactName } from '../../lib/display-names';
import { getErrorMessage } from '../../lib/errors';
import { toDateInputValue } from '../../lib/format';
import {
  CUSTOM_SIZE_PRICING_NOTE,
  findPanelTypeIdByApplication,
  isValidThicknessForApplication,
  panelSizeLabel,
  toDecimalNumber,
  type HplApplication,
  type SizeMode,
} from '../../lib/hpl-domain';
import type { LeadQualification, LeadQualificationItem } from '../../types/hpl';
import { SearchCombobox } from '../ui/search-combobox';
import { HplApplicationField } from './hpl-application-field';
import { HplThicknessField } from './hpl-thickness-field';
import {
  InstallationRequiredField,
  installationSelectionToBoolean,
} from './installation-required-field';
import {
  QualifyLeadFormInput,
  QualifyLeadFormValues,
  buildQualificationItemPayload,
  buildQualifyLeadPayload,
  defaultApplicationFromQualification,
  defaultContactMode,
  defaultObjectMode,
  defaultSizeModeFromQualification,
  normalizeQualificationAreaM2,
  nullableBooleanToTriStateSelection,
  qualifyLeadSchema,
  type QualificationItemPayload,
} from './qualify-lead-form';

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

let itemDraftSequence = 0;

type QualificationItemDraft = {
  key: string;
  id?: string;
  application?: HplApplication;
  thicknessMm: string;
  sizeMode: SizeMode;
  panelSizeId: string;
  customWidthMm: string;
  customHeightMm: string;
  colorCode: string;
  colorName: string;
  requiredAreaM2: string;
};

function nextItemDraftKey() {
  itemDraftSequence += 1;
  return `qualification-item-${itemDraftSequence}`;
}

function createBlankItemDraft(): QualificationItemDraft {
  return {
    key: nextItemDraftKey(),
    application: undefined,
    thicknessMm: '',
    sizeMode: 'STANDARD',
    panelSizeId: '',
    customWidthMm: '',
    customHeightMm: '',
    colorCode: '',
    colorName: '',
    requiredAreaM2: '',
  };
}

function qualificationItemDraftFromApi(
  item: LeadQualificationItem,
): QualificationItemDraft {
  const width = toDecimalNumber(item.customWidthMm);
  const height = toDecimalNumber(item.customHeightMm);

  return {
    key: nextItemDraftKey(),
    id: item.id,
    application: defaultApplicationFromQualification(
      item.application,
      item.panelType?.code,
    ),
    thicknessMm: toDecimalNumber(item.thicknessMm)?.toString() ?? '',
    sizeMode: defaultSizeModeFromQualification(item),
    panelSizeId: item.panelSizeId ?? '',
    customWidthMm: width?.toString() ?? '',
    customHeightMm: height?.toString() ?? '',
    colorCode: item.colorCode ?? '',
    colorName: item.colorName ?? '',
    requiredAreaM2: toDecimalNumber(item.requiredAreaM2)?.toString() ?? '',
  };
}

function hasLegacyScalarHplData(qualification?: LeadQualification | null) {
  if (!qualification) return false;

  return Boolean(
    qualification.application ||
      qualification.panelTypeId ||
      toDecimalNumber(qualification.thicknessMm) ||
      qualification.panelSizeId ||
      toDecimalNumber(qualification.customWidthMm) ||
      toDecimalNumber(qualification.customHeightMm) ||
      qualification.colorCode ||
      qualification.colorName ||
      toDecimalNumber(qualification.requiredAreaM2),
  );
}

function legacyScalarItemDraft(
  qualification: LeadQualification,
): QualificationItemDraft {
  return qualificationItemDraftFromApi({
    id: `legacy-${qualification.id}`,
    application: qualification.application,
    panelTypeId: qualification.panelTypeId,
    thicknessMm: qualification.thicknessMm,
    panelSizeId: qualification.panelSizeId,
    customWidthMm: qualification.customWidthMm,
    customHeightMm: qualification.customHeightMm,
    colorCode: qualification.colorCode,
    colorName: qualification.colorName,
    requiredAreaM2: qualification.requiredAreaM2,
    panelType: qualification.panelType,
    panelSize: qualification.panelSize,
  });
}

function initialItemDrafts(qualification?: LeadQualification | null) {
  // Once the server sends items (including []), it is the authoritative HPL model.
  if (qualification?.items !== undefined) {
    return qualification.items.map(qualificationItemDraftFromApi);
  }

  return hasLegacyScalarHplData(qualification) && qualification
    ? [legacyScalarItemDraft(qualification)]
    : [];
}

function HplItemCard({
  item,
  index,
  panelSizes,
  disabled,
  error,
  onChange,
  onDuplicate,
  onDelete,
}: {
  item: QualificationItemDraft;
  index: number;
  panelSizes: PanelSize[];
  disabled: boolean;
  error?: string;
  onChange: (item: QualificationItemDraft) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const update = <K extends keyof Omit<QualificationItemDraft, 'key'>>(
    field: K,
    value: QualificationItemDraft[K],
  ) => onChange({ ...item, [field]: value });
  const itemNumber = index + 1;

  return (
    <fieldset className="rounded border border-slate-300 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <legend className="text-sm font-semibold text-slate-900">
          HPL-позиция {itemNumber}
        </legend>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            disabled={disabled}
            onClick={onDuplicate}
          >
            Дублировать
          </button>
          <button
            type="button"
            className="rounded border border-red-300 bg-white px-2 py-1 text-xs text-red-700"
            disabled={disabled}
            onClick={onDelete}
          >
            Удалить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <HplApplicationField
          name={`qualification-item-${itemNumber}-application`}
          value={item.application}
          disabled={disabled}
          onChange={(application) =>
            onChange({
              ...item,
              application,
              thicknessMm:
                item.thicknessMm &&
                !isValidThicknessForApplication(application, item.thicknessMm)
                  ? ''
                  : item.thicknessMm,
            })
          }
        />

        <HplThicknessField
          application={item.application}
          value={item.thicknessMm}
          disabled={disabled}
          name={`qualification-item-${itemNumber}-thickness`}
          label="Толщина, мм (если известна)"
          onChange={(value) => update('thicknessMm', value)}
        />

        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-slate-700">
            Размер (если известен)
          </legend>
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={`qualification-item-${itemNumber}-size-mode`}
                checked={item.sizeMode === 'STANDARD'}
                disabled={disabled}
                onChange={() =>
                  onChange({
                    ...item,
                    sizeMode: 'STANDARD',
                    customWidthMm: '',
                    customHeightMm: '',
                  })
                }
              />
              Стандартный
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name={`qualification-item-${itemNumber}-size-mode`}
                checked={item.sizeMode === 'CUSTOM'}
                disabled={disabled}
                onChange={() =>
                  onChange({ ...item, sizeMode: 'CUSTOM', panelSizeId: '' })
                }
              />
              Нестандартный
            </label>
          </div>
          {item.sizeMode === 'STANDARD' ? (
            <select
              aria-label={`Размер позиции ${itemNumber}`}
              className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              disabled={disabled}
              value={item.panelSizeId}
              onChange={(event) => update('panelSizeId', event.target.value)}
            >
              <option value="">Не указан</option>
              {panelSizes.map((size) => (
                <option key={size.id} value={size.id}>
                  {panelSizeLabel(size)}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                aria-label={`Ширина позиции ${itemNumber}`}
                inputMode="numeric"
                className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                disabled={disabled}
                placeholder="Ширина, мм"
                value={item.customWidthMm}
                onChange={(event) => update('customWidthMm', event.target.value)}
              />
              <input
                aria-label={`Высота позиции ${itemNumber}`}
                inputMode="numeric"
                className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                disabled={disabled}
                placeholder="Высота, мм"
                value={item.customHeightMm}
                onChange={(event) => update('customHeightMm', event.target.value)}
              />
            </div>
          )}
          {item.sizeMode === 'CUSTOM' ? (
            <p className="mt-2 text-xs text-amber-700">{CUSTOM_SIZE_PRICING_NOTE}</p>
          ) : null}
        </fieldset>

        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Желаемый цвет / описание
          </span>
          <input
            aria-label={`Желаемый цвет / описание позиции ${itemNumber}`}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            disabled={disabled}
            placeholder="Например, тёмно-серый или под дерево"
            value={item.colorName}
            onChange={(event) => update('colorName', event.target.value)}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Точный код (если известен)
          </span>
          <input
            aria-label={`Точный код позиции ${itemNumber}`}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            disabled={disabled}
            placeholder="Например, RAL-9005"
            value={item.colorCode}
            onChange={(event) => update('colorCode', event.target.value)}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Площадь, м²
            <RequiredMark />
          </span>
          <input
            aria-label={`Площадь позиции ${itemNumber}`}
            type="text"
            inputMode="decimal"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            disabled={disabled}
            placeholder="Например, 24,5"
            value={item.requiredAreaM2}
            onChange={(event) => update('requiredAreaM2', event.target.value)}
          />
        </label>
      </div>
      <FieldError message={error} />
    </fieldset>
  );
}

function TriStateField({
  name,
  label,
  value,
  disabled,
  onChange,
}: {
  name: string;
  label: string;
  value: 'yes' | 'no' | 'unknown';
  disabled: boolean;
  onChange: (value: 'yes' | 'no' | 'unknown') => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-slate-700">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        {[
          ['yes', 'Да'],
          ['no', 'Нет'],
          ['unknown', 'Неизвестно'],
        ].map(([option, optionLabel]) => (
          <label
            key={option}
            className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              disabled={disabled}
              onChange={() => onChange(option as 'yes' | 'no' | 'unknown')}
            />
            {optionLabel}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function QualifyLeadModal({ lead, isOpen, onClose }: QualifyLeadModalProps) {
  if (!isOpen || !lead) {
    return null;
  }

  return <QualifyLeadModalContent key={lead.id} lead={lead} onClose={onClose} />;
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
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<QualificationItemDraft[]>(() =>
    initialItemDrafts(lead.qualification),
  );
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
      newObjectAddress: '',
      objectStage: lead.projectObject?.stage ?? '',
      objectExpectedDate: toDateInputValue(lead.projectObject?.expectedDate),
      contactMode: defaultContactMode(lead.contactId),
      contactId: lead.contactId ?? '',
      contactFirstName: '',
      contactLastName: '',
      contactPhone: '',
      contactEmail: '',
      needDescription: lead.needDescription ?? '',
      decisionMakerContact: lead.decisionMakerContact ?? '',
      installationRequired:
        lead.qualification?.installationRequired === true
          ? 'yes'
          : lead.qualification?.installationRequired === false
            ? 'no'
            : undefined,
      ventFacadeExists: nullableBooleanToTriStateSelection(
        lead.qualification?.ventFacadeExists,
      ),
      ventFacadeKitRequired: nullableBooleanToTriStateSelection(
        lead.qualification?.ventFacadeKitRequired,
      ),
      urgent: lead.qualification?.urgent ?? false,
      willingToWait: lead.qualification?.urgent
        ? false
        : (lead.qualification?.willingToWait ?? false),
    },
  });

  const selectedClientId = useWatch({ control, name: 'clientId' });
  const objectMode = useWatch({ control, name: 'objectMode' });
  const contactMode = useWatch({ control, name: 'contactMode' });
  const selectedContactId = useWatch({ control, name: 'contactId' });
  const clientDetailsQuery = useClient(selectedClientId || null);
  const busy = isSubmitting || qualifyLead.isPending;

  const clientOptions = (() => {
    const options = (clientsQuery.data?.items ?? []).map((client) => ({
      value: client.id,
      label: client.name,
      description: [client.inn, client.phone, client.email]
        .filter(Boolean)
        .join(' · '),
    }));
    if (lead.client && !options.some((option) => option.value === lead.client?.id)) {
      return [{ value: lead.client.id, label: lead.client.name }, ...options];
    }
    return options;
  })();

  const projectObjects = clientDetailsQuery.data?.projectObjects ?? [];
  const projectObjectOptions = (() => {
    const options = projectObjects
      .filter((object) => object.stage !== 'ARCHIVED')
      .map((object) => ({
        value: object.id,
        label: object.name,
        description: object.address ?? undefined,
      }));
    if (
      lead.projectObject &&
      !options.some((option) => option.value === lead.projectObject?.id)
    ) {
      return [
        {
          value: lead.projectObject.id,
          label: lead.projectObject.name,
          description: lead.projectObject.address ?? undefined,
        },
        ...options,
      ];
    }
    return options;
  })();

  const contacts = clientDetailsQuery.data?.contacts ?? [];
  const contactOptions = (() => {
    const options = contacts.map((contact) => ({
      value: contact.id,
      label: formatContactName(contact),
      description: [contact.position, contact.phone, contact.email]
        .filter(Boolean)
        .join(' · '),
    }));
    if (lead.contact && !options.some((option) => option.value === lead.contact?.id)) {
      return [{ value: lead.contact.id, label: formatContactName(lead.contact) }, ...options];
    }
    return options;
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

  const selectedProjectObjectId = useWatch({ control, name: 'projectObjectId' });
  const selectedProjectObject =
    projectObjects.find((object) => object.id === selectedProjectObjectId) ??
    (lead.projectObject?.id === selectedProjectObjectId
      ? lead.projectObject
      : null);

  useEffect(() => {
    if (selectedClientId === previousClientIdRef.current) {
      return;
    }

    previousClientIdRef.current = selectedClientId ?? '';
    setValue('projectObjectId', '');
    setValue('contactId', '');
    setValue('objectStage', '');
    setValue('objectExpectedDate', '');
    setValue('objectMode', 'EXISTING', { shouldValidate: true });
    setValue('contactMode', 'EXISTING', { shouldValidate: true });
  }, [selectedClientId, setValue]);

  const updateItem = (next: QualificationItemDraft) => {
    setItems((current) =>
      current.map((item) => (item.key === next.key ? next : item)),
    );
    setItemErrors((current) => {
      if (!current[next.key]) return current;
      const rest = { ...current };
      delete rest[next.key];
      return rest;
    });
  };

  const addItem = () => setItems((current) => [...current, createBlankItemDraft()]);

  const serializeItems = (): QualificationItemPayload[] | null => {
    const nextErrors: Record<string, string> = {};
    const panelTypes = panelTypesQuery.data ?? [];
    const serialized: QualificationItemPayload[] = [];

    items.forEach((item, index) => {
      const itemNumber = index + 1;
      if (!item.application) {
        nextErrors[item.key] = `Позиция ${itemNumber}: выберите применение / тип HPL`;
        return;
      }

      const panelTypeId = findPanelTypeIdByApplication(panelTypes, item.application);
      if (!panelTypeId) {
        nextErrors[item.key] = `Позиция ${itemNumber}: не удалось определить тип панели`;
        return;
      }

      if (
        item.thicknessMm.trim() &&
        !isValidThicknessForApplication(item.application, item.thicknessMm)
      ) {
        nextErrors[item.key] = `Позиция ${itemNumber}: укажите корректную толщину или очистите поле`;
        return;
      }

      if (item.sizeMode === 'CUSTOM') {
        const widthRaw = item.customWidthMm.trim();
        const heightRaw = item.customHeightMm.trim();
        if (widthRaw || heightRaw) {
          const width = toDecimalNumber(widthRaw);
          const height = toDecimalNumber(heightRaw);
          if (
            width === null ||
            height === null ||
            width <= 0 ||
            height <= 0 ||
            !Number.isInteger(width) ||
            !Number.isInteger(height)
          ) {
            nextErrors[item.key] = `Позиция ${itemNumber}: укажите целые ширину и высоту больше 0 или очистите оба поля`;
            return;
          }
        }
      }

      if (normalizeQualificationAreaM2(item.requiredAreaM2) === null) {
        nextErrors[item.key] = `Позиция ${itemNumber}: площадь должна быть положительным числом (до 4 знаков после запятой)`;
        return;
      }

      const payload = buildQualificationItemPayload(
        { ...item, application: item.application },
        panelTypeId,
      );
      serialized.push(item.id ? { ...payload, id: item.id } : payload);
    });

    setItemErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError('Проверьте HPL-позиции.');
      return null;
    }

    return serialized;
  };

  const onSubmit = async (values: QualifyLeadFormValues): Promise<void> => {
    if (submitLockRef.current) return;

    const serializedItems = serializeItems();
    if (!serializedItems) return;

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
          {
            name: values.newObjectName,
            ...(values.newObjectAddress?.trim()
              ? { address: values.newObjectAddress.trim() }
              : {}),
          },
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

      await qualifyLead.mutateAsync(
        buildQualifyLeadPayload({
          leadId: lead.id,
          clientId: values.clientId,
          contactId,
          projectObjectId,
          values,
          installationRequired: installationSelectionToBoolean(
            values.installationRequired,
          ),
          items: serializedItems,
        }),
      );
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Квалификация лида</h2>
            <p className="mt-1 text-sm text-slate-500">{lead.title}</p>
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
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          className="min-h-0 flex-1 overflow-y-auto p-5"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Клиент
                <RequiredMark />
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
                    searchPlaceholder="Поиск клиента"
                    emptyLabel="Клиенты не найдены"
                    loading={clientsQuery.isFetching}
                    onSearchChange={setClientSearch}
                  />
                )}
              />
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
                      setValue('newObjectAddress', '');
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
                  <Controller
                    name="projectObjectId"
                    control={control}
                    render={({ field }) => (
                      <SearchCombobox
                        value={field.value ?? ''}
                        onChange={(projectObjectId) => {
                          field.onChange(projectObjectId);
                          const selected =
                            projectObjects.find((object) => object.id === projectObjectId) ??
                            (lead.projectObject?.id === projectObjectId
                              ? lead.projectObject
                              : null);
                          setValue('objectStage', selected?.stage ?? '');
                          setValue(
                            'objectExpectedDate',
                            toDateInputValue(selected?.expectedDate),
                          );
                        }}
                        options={projectObjectOptions}
                        placeholder="Выберите объект"
                        searchPlaceholder="Поиск объекта"
                        emptyLabel="Объекты не найдены"
                        disabled={!selectedClientId}
                        loading={clientDetailsQuery.isFetching}
                      />
                    )}
                  />
                  <FieldError message={errors.projectObjectId?.message} />
                  {selectedProjectObject?.address ? (
                    <p className="mt-2 text-sm text-slate-600">
                      Адрес: {selectedProjectObject.address}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Название нового объекта
                      <RequiredMark />
                    </span>
                    <input
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                      {...register('newObjectName')}
                    />
                    <FieldError message={errors.newObjectName?.message} />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Адрес нового объекта
                    </span>
                    <input
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                      {...register('newObjectAddress')}
                    />
                  </label>
                </div>
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
                  <Controller
                    name="contactId"
                    control={control}
                    render={({ field }) => (
                      <SearchCombobox
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        options={contactOptions}
                        placeholder="Выберите контакт"
                        searchPlaceholder="Поиск контакта"
                        emptyLabel="Контакты не найдены"
                        disabled={!selectedClientId}
                        loading={clientDetailsQuery.isFetching}
                      />
                    )}
                  />
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
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Имя контакта
                      <RequiredMark />
                    </span>
                    <input
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      {...register('contactFirstName')}
                    />
                    <FieldError message={errors.contactFirstName?.message} />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Фамилия контакта
                    </span>
                    <input
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      {...register('contactLastName')}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Телефон контакта
                    </span>
                    <input
                      type="tel"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      {...register('contactPhone')}
                    />
                    <FieldError message={errors.contactPhone?.message} />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Email контакта
                    </span>
                    <input
                      type="email"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      {...register('contactEmail')}
                    />
                    <FieldError message={errors.contactEmail?.message} />
                  </label>
                </div>
              )}
            </fieldset>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                ЛПР / лицо, принимающее решение
                <RequiredMark />
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register('decisionMakerContact')}
              />
              <FieldError message={errors.decisionMakerContact?.message} />
            </label>
          </div>

          <section className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">HPL</h3>
              <button
                type="button"
                className="rounded border border-slate-400 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                disabled={busy}
                onClick={addItem}
              >
                + Добавить HPL-позицию
              </button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-slate-500">
                HPL-позиции пока не добавлены.
              </p>
            ) : null}
            {items.map((item, index) => (
              <HplItemCard
                key={item.key}
                item={item}
                index={index}
                panelSizes={panelSizesQuery.data ?? []}
                disabled={busy}
                error={itemErrors[item.key]}
                onChange={updateItem}
                onDuplicate={() =>
                  setItems((current) => {
                    const itemIndex = current.findIndex((entry) => entry.key === item.key);
                    const duplicate = {
                      ...item,
                      key: nextItemDraftKey(),
                      id: undefined,
                    };
                    return [
                      ...current.slice(0, itemIndex + 1),
                      duplicate,
                      ...current.slice(itemIndex + 1),
                    ];
                  })
                }
                onDelete={() =>
                  setItems((current) => current.filter((entry) => entry.key !== item.key))
                }
              />
            ))}
          </section>

          <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <h3 className="md:col-span-2 text-base font-semibold text-slate-900">
              Сроки и объект
            </h3>
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Дедлайн клиента
              </span>
              <input
                type="date"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                {...register('objectExpectedDate')}
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Стадия объекта
              </span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Например, скоро фасад"
                {...register('objectStage')}
              />
            </label>
            <Controller
              name="urgent"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(event) => {
                      field.onChange(event);
                      if (event.target.checked) {
                        setValue('willingToWait', false, { shouldValidate: true });
                      }
                    }}
                  />
                  Срочно
                </label>
              )}
            />
            <Controller
              name="willingToWait"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(event) => {
                      field.onChange(event);
                      if (event.target.checked) {
                        setValue('urgent', false, { shouldValidate: true });
                      }
                    }}
                  />
                  Готов ждать
                </label>
              )}
            />
            <FieldError message={errors.willingToWait?.message} />
          </section>

          <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <h3 className="md:col-span-2 text-base font-semibold text-slate-900">
              Вентфасад
            </h3>
            <Controller
              name="ventFacadeExists"
              control={control}
              render={({ field }) => (
                <TriStateField
                  name={field.name}
                  label="Вентфасад уже есть?"
                  value={field.value}
                  disabled={busy}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="ventFacadeKitRequired"
              control={control}
              render={({ field }) => (
                <TriStateField
                  name={field.name}
                  label="Нужна комплектация вентфасада?"
                  value={field.value}
                  disabled={busy}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="installationRequired"
              control={control}
              render={({ field }) => (
                <InstallationRequiredField
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.installationRequired?.message}
                  name="qualification-installationRequired"
                />
              )}
            />
          </section>

          <section className="mt-5">
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Потребность / требования клиента
                <RequiredMark />
              </span>
              <textarea
                rows={4}
                className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register('needDescription')}
              />
              <FieldError message={errors.needDescription?.message} />
            </label>
          </section>

          {isSubmitted && !isValid ? (
            <p className="mt-4 text-sm text-red-600">
              Заполните обязательные поля, отмеченные *.
            </p>
          ) : null}
          {formError ? <p className="mt-4 text-sm text-red-600">{formError}</p> : null}

          <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:opacity-60"
            >
              {busy ? 'Сохранение...' : 'Квалифицировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
