'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import {
  Calculator,
  CircleDot,
  FileText,
  Phone,
  StickyNote,
  UserPlus,
} from 'lucide-react';
import { QualifyLeadModal } from '@/components/leads/qualify-lead-modal';
import { UnqualifyLeadModal } from '@/components/leads/unqualify-lead-modal';
import { Button } from '@/components/ui/button';
import { SearchCombobox } from '@/components/ui/search-combobox';
import { useAuth } from '@/context/auth-context';
import {
  useCalculationsByLead,
  useFinalizeCalculation,
} from '@/hooks/use-calculations';
import {
  useCreateLeadCall,
  useCreateLeadNote,
  useLeadWorkspace,
} from '@/hooks/use-lead-workspace';
import {
  Lead,
  LeadStatus,
  useAssignLeadOwner,
  useConfirmLeadCommercialQualification,
  useLead,
} from '@/hooks/use-leads';
import {
  useSupplierQualityClasses,
  useSuppliers,
} from '@/hooks/use-panels';
import {
  useConvertCalculationToQuote,
  useConvertQuoteToDeal,
  useQuotes,
  useRecordQuoteClientAcceptance,
  useUpdateQuoteStatus,
} from '@/hooks/use-quotes';
import { useUsersList } from '@/hooks/use-users';
import { finalizeCalculationBeforeQuote } from '@/lib/calculation-quote';
import { formatMoney } from '@/lib/currency';
import {
  formatContactName,
  formatPersonName,
  resolveEntityName,
  resolveUserName,
} from '@/lib/display-names';
import { formatDateTime, formatNumber } from '@/lib/format';
import { formatSupplierName, leadStatusLabels } from '@/lib/labels';
import { hasElevatedAccess } from '@/lib/role-access';
import {
  CalculationSession,
  LeadActivity,
  LeadQualification,
  Quote,
  QuoteStatus,
} from '@/types/hpl';

const HplCalculatorWizard = dynamic(
  () =>
    import('@/components/calculator/hpl-calculator-wizard').then(
      (m) => m.HplCalculatorWizard,
    ),
  { ssr: false },
);

type WorkspaceTab = 'info' | 'timeline' | 'calculations' | 'quotes';

const statusClassName: Record<LeadStatus, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  QUALIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UNQUALIFIED: 'bg-slate-100 text-slate-700 border-slate-200',
  CONVERTED: 'bg-green-50 text-green-700 border-green-200',
};

const quoteStatusLabels: Record<QuoteStatus, string> = {
  draft: 'Черновик',
  sent: 'Отправлено',
  approved: 'Согласовано',
  rejected: 'Отклонено',
  converted: 'Конвертировано',
};

const quoteStatusClassName: Record<QuoteStatus, string> = {
  draft: 'border-slate-200 bg-slate-50 text-slate-700',
  sent: 'border-blue-200 bg-blue-50 text-blue-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  converted: 'border-violet-200 bg-violet-50 text-violet-700',
};

const PANEL_TYPE_LABELS: Record<string, string> = {
  exterior: 'Экстерьер',
  interior: 'Интерьер',
  laboratory: 'Лабораторная',
};

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'info', label: 'Инфо' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'calculations', label: 'Расчёты' },
  { id: 'quotes', label: 'КП' },
];

type TimelineItem = {
  id: string;
  type: string;
  createdAt: string;
  description: string;
  actor: string;
};

function normalizeSource(source?: string | null): string {
  return (source ?? '').trim().toLowerCase();
}

function sourceBadgeClass(source: string): string {
  if (source === 'telegram') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (source === 'website') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function sourceLabel(source: string): string {
  if (source === 'telegram') {
    return 'Telegram';
  }

  if (source === 'website') {
    return 'Сайт';
  }

  if (source === 'manual') {
    return 'Вручную';
  }

  return source || '—';
}

function StatusBadge({ status }: { status: string }) {
  const leadStatus = status as LeadStatus;

  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold ${
        statusClassName[leadStatus] ??
        'border-slate-200 bg-slate-50 text-slate-700'
      }`}
    >
      {leadStatusLabels[leadStatus] ?? status}
    </span>
  );
}

function SourceBadge({ source }: { source?: string | null }) {
  const normalized = normalizeSource(source);

  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold ${sourceBadgeClass(normalized)}`}
    >
      {sourceLabel(normalized)}
    </span>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm text-slate-950">{value || '—'}</div>
    </div>
  );
}

function activityIcon(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes('call')) {
    return Phone;
  }

  if (normalized.includes('note')) {
    return StickyNote;
  }

  if (normalized.includes('calculat')) {
    return Calculator;
  }

  if (normalized.includes('quote') || normalized.includes('offer')) {
    return FileText;
  }

  if (normalized.includes('assign') || normalized.includes('owner')) {
    return UserPlus;
  }

  return CircleDot;
}

function buildTimeline(
  activities: LeadActivity[],
  lead: Lead,
  calls: { id: string; createdAt: string; dialUri?: string; actorName?: string | null; createdBy?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null }[],
  notes: { id: string; createdAt: string; text: string; actorName?: string | null; createdBy?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null }[],
  calculations: CalculationSession[],
  quotes: Quote[],
): TimelineItem[] {
  if (activities.length > 0) {
    return activities
      .map((item) => ({
        id: item.id,
        type: item.type,
        createdAt: item.createdAt,
        description: item.description || item.type,
        actor: item.actorName || formatPersonName(item.actor),
      }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  const items: TimelineItem[] = [
    {
      id: `created-${lead.id}`,
      type: 'created',
      createdAt: lead.createdAt,
      description: 'Лид создан',
      actor: resolveUserName(lead.owner, lead.ownerId),
    },
  ];

  for (const call of calls) {
    items.push({
      id: `call-${call.id}`,
      type: 'call',
      createdAt: call.createdAt,
      description: call.dialUri
        ? `Звонок ${call.dialUri.replace('tel:', '')}`
        : 'Звонок',
      actor: call.actorName || formatPersonName(call.createdBy),
    });
  }

  for (const note of notes) {
    items.push({
      id: `note-${note.id}`,
      type: 'note',
      createdAt: note.createdAt,
      description: note.text,
      actor: note.actorName || formatPersonName(note.createdBy),
    });
  }

  for (const calculation of calculations) {
    items.push({
      id: `calc-${calculation.id}`,
      type: 'calculation',
      createdAt: calculation.createdAt,
      description: `Расчёт на ${formatMoney(calculation.totalAmount)}`,
      actor: '—',
    });
  }

  for (const quote of quotes) {
    items.push({
      id: `quote-${quote.id}`,
      type: 'quote',
      createdAt: quote.createdAt,
      description: `КП ${quote.number ?? ''} · ${quoteStatusLabels[quote.status] ?? quote.status} · ${formatMoney(quote.totalAmount)}`,
      actor: '—',
    });
  }

  return items.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function calculationSheetsCount(
  calculation: CalculationSession,
): number | null {
  const items = calculation.items ?? [];
  if (items.length === 0) {
    return null;
  }

  return items.reduce((sum, item) => {
    const count = Number(item.sheetsCount);
    return sum + (Number.isNaN(count) ? 0 : count);
  }, 0);
}

function calculationSummary(calculation: CalculationSession) {
  const item = calculation.items?.[0];
  const typeName =
    item?.panelType?.name ||
    item?.panelType?.displayNameRu ||
    PANEL_TYPE_LABELS[item?.panelType?.code ?? ''] ||
    '—';
  const supplierName = formatSupplierName(
    item?.supplier?.code,
    item?.supplier?.name,
    '—',
  );
  const sizeLabel = item?.panelSize?.label
    ? item.panelSize.label
    : item?.panelSize?.displayName
      ? item.panelSize.displayName
      : item?.panelSize?.width && item.panelSize.length
        ? `${item.panelSize.width} × ${item.panelSize.length}`
        : '—';

  return {
    typeName,
    supplierName,
    sizeLabel,
    thickness: item?.thicknessMm ?? '—',
    sheets: calculationSheetsCount(calculation),
    total: calculation.totalAmount,
  };
}

function panelCodeForQualification(
  qualification?: LeadQualification | null,
): string {
  const code = qualification?.panelType?.code?.trim().toLowerCase();
  if (code) {
    return code;
  }

  return qualification?.application === 'EXTERIOR' ? 'exterior' : 'interior';
}

function installationLabel(value?: boolean | null): string {
  if (value === true) {
    return 'Да';
  }

  if (value === false) {
    return 'Нет';
  }

  return 'Не указано';
}

function CommercialQualificationPanel({
  leadId,
  qualification,
  currentSupplierId,
  currentQualityClassId,
}: {
  leadId: string;
  qualification?: LeadQualification | null;
  currentSupplierId?: string | null;
  currentQualityClassId?: string | null;
}) {
  const suppliersQuery = useSuppliers();
  const confirmCommercial = useConfirmLeadCommercialQualification();
  const [supplierId, setSupplierId] = useState(currentSupplierId ?? '');
  const [qualityClassId, setQualityClassId] = useState(
    currentQualityClassId ?? '',
  );
  const [comment, setComment] = useState('');

  const suppliers = suppliersQuery.data ?? [];
  const selectedSupplier = suppliers.find((item) => item.id === supplierId);
  const supplierCode = selectedSupplier?.code ?? '';
  const panelTypeCode = panelCodeForQualification(qualification);
  const qualityQuery = useSupplierQualityClasses(supplierCode, panelTypeCode);
  const qualityClasses = qualityQuery.data ?? [];

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.id,
    label: formatSupplierName(supplier.code, supplier.name),
    description: supplier.code,
  }));
  const qualityOptions = qualityClasses.map((quality) => ({
    value: quality.id,
    label: quality.nameRu ?? quality.name ?? quality.code ?? quality.id,
    description: quality.code ?? undefined,
  }));

  const canSubmit =
    Boolean(supplierId && qualityClassId) && !confirmCommercial.isPending;

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <h4 className="text-sm font-semibold text-slate-900">
        Коммерческая квалификация
      </h4>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <SearchCombobox
          value={supplierId}
          onChange={(nextValue) => {
            setSupplierId(nextValue);
            setQualityClassId('');
          }}
          options={supplierOptions}
          placeholder="Поставщик"
          searchPlaceholder="Поиск поставщика"
          emptyLabel="Поставщики не найдены"
          loading={suppliersQuery.isFetching}
        />
        <SearchCombobox
          value={qualityClassId}
          onChange={setQualityClassId}
          options={qualityOptions}
          placeholder="Класс качества"
          searchPlaceholder="Поиск класса"
          emptyLabel="Классы не найдены"
          disabled={!supplierId}
          loading={qualityQuery.isFetching}
        />
        <input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Комментарий"
          className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 md:col-span-2"
        />
      </div>
      <Button
        type="button"
        size="sm"
        className="mt-3"
        disabled={!canSubmit}
        onClick={() => {
          void confirmCommercial.mutateAsync({
            id: leadId,
            supplierId,
            qualityClassId,
            ...(comment.trim() ? { decisionComment: comment.trim() } : {}),
          });
        }}
      >
        {confirmCommercial.isPending ? 'Сохранение...' : 'Подтвердить'}
      </Button>
    </div>
  );
}

export function LeadWorkspace({ leadId }: { leadId: string }) {
  const { user } = useAuth();
  const leadQuery = useLead(leadId);
  const workspaceQuery = useLeadWorkspace(leadId);
  const calculationsQuery = useCalculationsByLead(leadId);
  const quotesQuery = useQuotes(leadId);
  const { users, usersById } = useUsersList();
  const createCall = useCreateLeadCall();
  const createNote = useCreateLeadNote();
  const assignOwner = useAssignLeadOwner();
  const convertToQuote = useConvertCalculationToQuote();
  const finalizeCalculation = useFinalizeCalculation();
  const updateQuoteStatus = useUpdateQuoteStatus();
  const recordClientAcceptance = useRecordQuoteClientAcceptance();
  const convertQuoteToDeal = useConvertQuoteToDeal();
  const finalizedCalculationIds = useRef(new Set<string>());

  const [tab, setTab] = useState<WorkspaceTab>('info');
  const [noteText, setNoteText] = useState('');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [ownerId, setOwnerId] = useState('');
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [unqualifyingLead, setUnqualifyingLead] = useState<Lead | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const lead = leadQuery.data;
  const workspace = workspaceQuery.data;
  const calculations = useMemo(
    () => calculationsQuery.data ?? workspace?.calculations ?? [],
    [calculationsQuery.data, workspace?.calculations],
  );
  const quotes = useMemo(
    () => quotesQuery.data ?? workspace?.quotes ?? [],
    [quotesQuery.data, workspace?.quotes],
  );
  const qualification = workspace?.qualification ?? null;
  const commercialQualification = workspace?.commercialQualification ?? null;
  const canCommercialQualify =
    user?.permissions.includes('leads:commercial_qualify') ?? false;
  const canApproveQuote = user?.permissions.includes('quotes:approve') ?? false;
  const source = lead?.source ?? workspace?.lead.source;
  const contact = lead?.contact ?? workspace?.lead.contact;
  const clientName =
    resolveEntityName(lead?.client, lead?.clientId) !== '—'
      ? resolveEntityName(lead?.client, lead?.clientId)
      : (workspace?.lead.client?.name ?? lead?.title ?? 'Лид');

  const canAssign =
    Boolean(lead) &&
    (!lead?.ownerId || hasElevatedAccess(user?.roles ?? []));

  const ownerOptions = useMemo(
    () =>
      users.map((item) => ({
        value: item.id,
        label: formatPersonName(item, item.email),
        description: item.email,
      })),
    [users],
  );

  const timeline = useMemo(() => {
    if (!lead) {
      return [];
    }

    return buildTimeline(
      workspace?.activities ?? [],
      lead,
      workspace?.calls ?? [],
      workspace?.notes ?? [],
      calculations,
      quotes,
    );
  }, [calculations, lead, quotes, workspace]);

  const onCall = async (): Promise<void> => {
    const call = await createCall.mutateAsync({ leadId });
    if (call.dialUri) {
      window.location.href = call.dialUri;
    }
  };

  const onAddNote = async (): Promise<void> => {
    const text = noteText.trim();
    if (!text) {
      return;
    }

    await createNote.mutateAsync({ leadId, text });
    setNoteText('');
  };

  const openNoteTab = (): void => {
    setTab('timeline');
    window.setTimeout(() => noteRef.current?.focus(), 0);
  };

  if (leadQuery.isLoading) {
    return (
      <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Загрузка рабочего места лида...
      </div>
    );
  }

  if (leadQuery.isError || !lead) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Не удалось загрузить лид.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/leads"
              className="text-sm font-medium text-slate-600 hover:text-slate-950"
            >
              Назад к лидам
            </Link>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              {clientName}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={lead.status} />
              <SourceBadge source={source} />
              <span className="text-sm text-slate-600">{lead.title}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void onCall();
              }}
              disabled={createCall.isPending}
            >
              Позвонить
            </Button>
            <Button type="button" onClick={() => setIsCalculatorOpen(true)}>
              Новый расчёт
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQualifyingLead(lead)}
              disabled={lead.status === 'CONVERTED'}
            >
              Квалифицировать
            </Button>
            <Button type="button" variant="outline" onClick={openNoteTab}>
              Добавить заметку
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto border-b border-slate-200">
          <div className="flex w-max min-w-full gap-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                  tab === item.id
                    ? 'border-slate-900 text-slate-950'
                    : 'border-transparent text-slate-600 hover:text-slate-950'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'info' ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <section className="rounded border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-950">Контакт</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Клиент" value={clientName} />
                <Field
                  label="Контакт"
                  value={contact ? formatContactName(contact) : '—'}
                />
                <Field label="Телефон" value={contact?.phone} />
                <Field label="Email" value={contact?.email} />
                <Field label="Источник" value={sourceLabel(normalizeSource(source))} />
                <Field
                  label="Ответственный"
                  value={resolveUserName(lead.owner, lead.ownerId, usersById)}
                />
                <Field
                  label="Объект"
                  value={resolveEntityName(lead.projectObject, lead.projectObjectId)}
                />
                <Field
                  label="Сделка"
                  value={resolveEntityName(lead.deal, lead.dealId)}
                />
                <Field label="Оценка суммы" value={formatMoney(lead.estimatedAmount)} />
                <Field
                  label="Целевая дата"
                  value={lead.targetDate ? formatDateTime(lead.targetDate) : '—'}
                />
                <div className="md:col-span-2">
                  <Field label="Потребность" value={lead.needDescription} />
                </div>
              </div>

              {canAssign ? (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  {isAssignOpen ? (
                    <div className="max-w-sm space-y-3">
                      <SearchCombobox
                        value={ownerId}
                        onChange={setOwnerId}
                        options={ownerOptions}
                        placeholder="Выберите менеджера"
                        searchPlaceholder="Поиск сотрудника"
                        emptyLabel="Сотрудники не найдены"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!ownerId || assignOwner.isPending}
                          onClick={() => {
                            void assignOwner.mutateAsync({
                              id: lead.id,
                              ownerId,
                            }).then(() => setIsAssignOpen(false));
                          }}
                        >
                          Сохранить
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAssignOpen(false)}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOwnerId(lead.ownerId);
                        setIsAssignOpen(true);
                      }}
                    >
                      Назначить на менеджера
                    </Button>
                  )}
                </div>
              ) : null}
            </section>

            <section className="rounded border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-950">Статус</h3>
              <div className="mt-4 space-y-4">
                <Field label="Создан" value={formatDateTime(lead.createdAt)} />
                <Field label="Обновлён" value={formatDateTime(lead.updatedAt)} />
                <Field label="ЛПР" value={lead.decisionMakerContact} />
                <Field
                  label="Монтаж"
                  value={installationLabel(qualification?.installationRequired)}
                />
                <Field label="Причина брака" value={lead.unqualificationReason} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={lead.status === 'UNQUALIFIED'}
                  onClick={() => setUnqualifyingLead(lead)}
                >
                  Брак
                </Button>
                {canCommercialQualify && lead.status === 'QUALIFIED' ? (
                  <CommercialQualificationPanel
                    leadId={lead.id}
                    qualification={qualification}
                    currentSupplierId={commercialQualification?.supplierId}
                    currentQualityClassId={
                      commercialQualification?.qualityClassId
                    }
                  />
                ) : null}
              </div>
            </section>
          </div>
        ) : null}

        {tab === 'timeline' ? (
          <section className="rounded border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-950">
              История активностей
            </h3>
            <div className="mt-4 space-y-3">
              <textarea
                ref={noteRef}
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                placeholder="Новая заметка по лиду"
                rows={3}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <Button
                type="button"
                disabled={!noteText.trim() || createNote.isPending}
                onClick={() => {
                  void onAddNote();
                }}
              >
                {createNote.isPending ? 'Сохранение...' : 'Добавить заметку'}
              </Button>
            </div>

            <div className="mt-6 space-y-3">
              {workspaceQuery.isLoading ? (
                <p className="text-sm text-slate-600">Загрузка истории...</p>
              ) : null}
              {timeline.map((item) => {
                const Icon = activityIcon(item.type);

                return (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded border border-slate-200 p-3"
                  >
                    <div className="mt-0.5 rounded border border-slate-200 bg-slate-50 p-1.5 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-950">{item.description}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDateTime(item.createdAt)} · {item.actor}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!workspaceQuery.isLoading && timeline.length === 0 ? (
                <p className="text-sm text-slate-500">Событий пока нет.</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === 'calculations' ? (
          <section className="rounded border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-950">Расчёты</h3>
              <Button type="button" size="sm" onClick={() => setIsCalculatorOpen(true)}>
                Новый расчёт
              </Button>
            </div>
            {calculationsQuery.isLoading ? (
              <p className="text-sm text-slate-600">Загрузка расчётов...</p>
            ) : null}
            {calculationsQuery.isError ? (
              <p className="text-sm text-red-600">Не удалось загрузить расчёты.</p>
            ) : null}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Дата</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Тип</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Поставщик</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Размер</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Толщина</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Листы</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Итого</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-700">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {calculations.map((calculation) => {
                    const summary = calculationSummary(calculation);

                    return (
                      <tr key={calculation.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                          {formatDateTime(calculation.createdAt)}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{summary.typeName}</td>
                        <td className="px-3 py-2 text-slate-700">{summary.supplierName}</td>
                        <td className="px-3 py-2 text-slate-700">{summary.sizeLabel}</td>
                        <td className="px-3 py-2 text-slate-700">{summary.thickness} мм</td>
                        <td className="px-3 py-2 text-slate-700">
                          {formatNumber(summary.sheets)}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {formatMoney(summary.total)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              convertToQuote.isPending ||
                              finalizeCalculation.isPending
                            }
                            onClick={() => {
                              void (async () => {
                                try {
                                  const alreadyFinalized =
                                    calculation.status === 'finalized' ||
                                    finalizedCalculationIds.current.has(
                                      calculation.id,
                                    );

                                  await finalizeCalculationBeforeQuote({
                                    calculationId: calculation.id,
                                    isFinalized: alreadyFinalized,
                                    finalize:
                                      finalizeCalculation.mutateAsync,
                                    onFinalized: () => {
                                      finalizedCalculationIds.current.add(
                                        calculation.id,
                                      );
                                    },
                                    convert: (calculationId) =>
                                      convertToQuote.mutateAsync({
                                        calculationId,
                                      }),
                                  });
                                } catch {
                                  // mutation onError already toasted
                                }
                              })();
                            }}
                          >
                            {convertToQuote.isPending ||
                            finalizeCalculation.isPending
                              ? 'Создание КП...'
                              : 'Конвертировать в КП'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!calculationsQuery.isLoading && calculations.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  Расчётов пока нет.
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === 'quotes' ? (
          <section className="rounded border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-950">КП</h3>
            {quotesQuery.isLoading ? (
              <p className="mt-4 text-sm text-slate-600">Загрузка КП...</p>
            ) : null}
            {quotesQuery.isError ? (
              <p className="mt-4 text-sm text-red-600">Не удалось загрузить КП.</p>
            ) : null}
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Номер</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Статус</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Сумма</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Дата</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-700">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {quotes.map((quote) => (
                    <tr key={quote.id}>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {quote.number ?? quote.id}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold ${quoteStatusClassName[quote.status]}`}
                        >
                          {quoteStatusLabels[quote.status] ?? quote.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatMoney(quote.totalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                        {formatDateTime(quote.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {quote.status === 'draft' ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={updateQuoteStatus.isPending}
                            onClick={() => {
                              void updateQuoteStatus.mutateAsync({
                                id: quote.id,
                                status: 'sent',
                              });
                            }}
                          >
                            Отправить клиенту
                          </Button>
                        ) : null}
                        {quote.status === 'sent' && canApproveQuote ? (
                          <div className="mt-2 flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={updateQuoteStatus.isPending}
                              onClick={() => {
                                void updateQuoteStatus.mutateAsync({
                                  id: quote.id,
                                  status: 'approved',
                                });
                              }}
                            >
                              Одобрить
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={updateQuoteStatus.isPending}
                              onClick={() => {
                                const rejectionReason = window.prompt(
                                  'Причина отказа',
                                );
                                if (rejectionReason?.trim()) {
                                  void updateQuoteStatus.mutateAsync({
                                    id: quote.id,
                                    status: 'rejected',
                                    rejectionReason: rejectionReason.trim(),
                                  });
                                }
                              }}
                            >
                              Отклонить
                            </Button>
                          </div>
                        ) : null}
                        {quote.status === 'approved' ? (
                          <div className="mt-2 flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={recordClientAcceptance.isPending}
                              onClick={() => {
                                void recordClientAcceptance.mutateAsync(
                                  quote.id,
                                );
                              }}
                            >
                              Клиент согласен
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={convertQuoteToDeal.isPending}
                              onClick={() => {
                                void convertQuoteToDeal.mutateAsync(quote.id);
                              }}
                            >
                              В сделку
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!quotesQuery.isLoading && quotes.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  КП пока нет.
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      <QualifyLeadModal
        lead={qualifyingLead}
        isOpen={Boolean(qualifyingLead)}
        onClose={() => setQualifyingLead(null)}
      />
      <UnqualifyLeadModal
        lead={unqualifyingLead}
        isOpen={Boolean(unqualifyingLead)}
        onClose={() => setUnqualifyingLead(null)}
      />
      {isCalculatorOpen ? (
        <HplCalculatorWizard
          leadId={lead.id}
          onClose={() => setIsCalculatorOpen(false)}
          onSuccess={() => setIsCalculatorOpen(false)}
        />
      ) : null}
    </>
  );
}
