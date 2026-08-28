'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { LoseOpportunityModal } from '@/components/opportunities/lose-opportunity-modal';
import { CalculationRequestPanel } from '@/components/calculations/calculation-request-panel';
import { QuoteCard } from '@/components/quotes/quote-card';
import { RejectQuoteModal } from '@/components/quotes/reject-quote-modal';
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
  useHandoffLeadToHead,
  useLead,
  useLoseLead,
  useUpdateLeadManagerCommercialNote,
} from '@/hooks/use-leads';
import {
  useSupplierQualityClasses,
  useSuppliers,
} from '@/hooks/use-panels';
import {
  useApproveQuotePricing,
  usePreviewQuotePricing,
  useConvertCalculationToQuote,
  useConvertQuoteToDeal,
  useDownloadQuotePdf,
  useDownloadQuoteDocx,
  useFinalizeQuote,
  useCreateQuoteVersion,
  useQuotes,
  useRecordQuoteClientAcceptance,
  useUpdateQuoteCommercialTerms,
  useUpdateQuoteStatus,
  isQuoteTermsLockedError,
} from '@/hooks/use-quotes';
import { useUsersList } from '@/hooks/use-users';
import { finalizeCalculationBeforeQuote } from '@/lib/calculation-quote';
import {
  COMMERCIAL_CALCULATION_WAITING_COPY,
  canConvertCalculationToQuote,
  canRunCommercialCalculation,
  shouldWaitForCommercialCalculation,
} from '@/lib/calculation-presentation';
import {
  QUALITY_LINE_PLACEHOLDER,
  QUALITY_LINES_EMPTY_MESSAGE,
  QUALITY_LINES_LOAD_ERROR_MESSAGE,
  QUALITY_LINES_NOT_FOUND,
  qualityLineLabel,
} from '@/lib/quality-line-presentation';
import { formatMoney } from '@/lib/currency';
import {
  displayContactValue,
  mergeContactSources,
  resolveClientContactPresentation,
} from '@/lib/client-contact';
import {
  formatPersonName,
  resolveEntityName,
  resolveUserName,
} from '@/lib/display-names';
import {
  dateInputToIso,
  formatDate,
  formatDateTime,
  formatNumber,
  toDateInputValue,
} from '@/lib/format';
import {
  formatAreaM2,
  formatColorLabel,
  formatQualificationSize,
  formatThicknessMm,
  hplApplicationLabel,
  normalizePanelTypeCode,
  panelSizeLabel,
  panelTypeCodeFromApplication,
  panelTypeLabel,
} from '@/lib/hpl-domain';
import { formatSupplierName, leadStatusLabels } from '@/lib/labels';
import {
  HANDOFF_DONE_LABEL,
  HANDOFF_TO_HEAD_LABEL,
  MANAGER_CUSTOMER_NOTE_HEAD_LABEL,
  MANAGER_CUSTOMER_NOTE_HELPER,
  MANAGER_CUSTOMER_NOTE_LABEL,
  canWriteManagerCommercialNote,
} from '@/lib/manager-commercial-note';
import { dealWorkspaceHref } from '@/lib/entity-routes';
import { getErrorMessage } from '@/lib/errors';
import { getApiErrorCode, QUOTE_PRICE_NOT_APPROVED } from '@/lib/hpl-errors';
import { lossReasonLabel } from '@/lib/loss-reasons';
import { QuoteAction, quoteStatusLabels } from '@/lib/quote-presentation';
import { MIXED_CURRENCY_TOTAL_HINT, quoteUsesMixedCurrencies } from '@/lib/quote-pricing';
import {
  CalculationSession,
  LeadActivity,
  LeadQualification,
  Quote,
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
  LOST: 'bg-red-50 text-red-700 border-red-200',
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
  const display =
    value === undefined || value === null || value === ''
      ? '—'
      : String(value);

  return (
    <div>
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm text-slate-950">
        {display === '[object Object]' ? '—' : display}
      </div>
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
      description: `КП ${quote.number ?? ''} · ${quoteStatusLabels[quote.status] ?? quote.status} · ${
        quoteUsesMixedCurrencies(quote)
          ? MIXED_CURRENCY_TOTAL_HINT
          : formatMoney(quote.totalAmount)
      }`,
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

  return {
    typeName: panelTypeLabel(item?.panelType),
    supplierName: formatSupplierName(
      item?.supplier?.code,
      item?.supplier?.name,
      '—',
    ),
    sizeLabel: panelSizeLabel(item?.panelSize),
    thickness: formatThicknessMm(item?.thicknessMm),
    sheets: calculationSheetsCount(calculation),
    total: calculation.totalAmount,
  };
}

function panelCodeForQualification(
  qualification?: LeadQualification | null,
): string {
  return (
    normalizePanelTypeCode(qualification?.panelType?.code) ??
    panelTypeCodeFromApplication(qualification?.application) ??
    ''
  );
}

const QUALIFICATION_CONTEXT_TITLE = 'Квалификация клиента';
const SAVED_CALCULATION_ACTION_LABEL = 'Новый расчёт';

function QualificationContext({
  qualification,
  projectObject,
  customerNeed,
}: {
  qualification?: LeadQualification | null;
  projectObject?: Lead['projectObject'];
  customerNeed?: string | null;
}) {
  const items = qualification?.items;
  const showLegacyScalars = items === undefined;

  return (
    <div className="space-y-4">
      {items?.length ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-900">
            HPL-позиции ({items.length})
          </div>
          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded border border-slate-200 bg-slate-50 p-3"
            >
              <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Позиция {index + 1}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field
                  label="Применение / тип HPL"
                  value={hplApplicationLabel(item.application)}
                />
                <Field label="Размер" value={formatQualificationSize(item)} />
                <Field
                  label="Толщина"
                  value={formatThicknessMm(item.thicknessMm)}
                />
                <Field label="Цвет" value={formatColorLabel(item)} />
                <Field
                  label="Площадь"
                  value={formatAreaM2(item.requiredAreaM2)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : items ? (
        <p className="text-sm text-slate-500">HPL-позиции не добавлены.</p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {showLegacyScalars ? (
          <>
            <Field
              label="Применение / тип HPL"
              value={hplApplicationLabel(qualification?.application)}
            />
            <Field
              label="Размер"
              value={formatQualificationSize(qualification)}
            />
            <Field
              label="Толщина"
              value={formatThicknessMm(qualification?.thicknessMm)}
            />
            <Field
              label="Цвет"
              value={formatColorLabel(qualification)}
            />
            <Field
              label="Площадь"
              value={formatAreaM2(qualification?.requiredAreaM2)}
            />
          </>
        ) : null}
        <Field
          label="Дедлайн клиента"
          value={
            projectObject?.expectedDate
              ? formatDate(projectObject.expectedDate)
              : undefined
          }
        />
        <Field label="Стадия объекта" value={projectObject?.stage} />
        <Field
          label="Срочность"
          value={urgencyLabel(
            qualification?.urgent,
            qualification?.willingToWait,
          )}
        />
        <Field
          label="Вентфасад уже есть?"
          value={triStateLabel(qualification?.ventFacadeExists)}
        />
        <Field
          label="Комплектация вентфасада"
          value={triStateLabel(qualification?.ventFacadeKitRequired)}
        />
        <Field
          label="Монтаж"
          value={installationLabel(qualification?.installationRequired)}
        />
        <div className="md:col-span-2">
          <Field
            label="Потребность"
            value={
              qualification?.customerRequirements?.trim() || customerNeed
            }
          />
        </div>
      </div>
    </div>
  );
}

function urgencyLabel(
  urgent?: boolean | null,
  willingToWait?: boolean | null,
): string {
  if (urgent) {
    return 'Срочно';
  }
  if (willingToWait) {
    return 'Готов ждать';
  }
  return 'Не указано';
}

function triStateLabel(value?: boolean | null): string {
  if (value === true) {
    return 'Да';
  }
  if (value === false) {
    return 'Нет';
  }
  return 'Неизвестно';
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

function ManagerCustomerNotePanel({
  lead,
  canWrite,
}: {
  lead: Lead;
  canWrite: boolean;
}) {
  const saveNote = useUpdateLeadManagerCommercialNote();
  const handoff = useHandoffLeadToHead();
  const [note, setNote] = useState(lead.managerCommercialNote ?? '');
  const [optimisticReadyAt, setOptimisticReadyAt] = useState<string | null>(
    null,
  );
  const handedOffAt =
    optimisticReadyAt ?? lead.managerCommercialInputReadyAt ?? null;

  const label = canWrite
    ? MANAGER_CUSTOMER_NOTE_LABEL
    : MANAGER_CUSTOMER_NOTE_HEAD_LABEL;
  const canHandoff =
    canWrite && lead.status === 'QUALIFIED' && !handedOffAt && !handoff.isPending;

  return (
    <div
      className={
        canWrite
          ? 'mt-6 border-t border-slate-200 pt-4'
          : 'mt-6 rounded border border-amber-200 bg-amber-50 p-4'
      }
    >
      <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
      {canWrite ? (
        <>
          <p className="mt-1 text-xs text-slate-500">
            {MANAGER_CUSTOMER_NOTE_HELPER}
          </p>
          <textarea
            value={note}
            aria-label={MANAGER_CUSTOMER_NOTE_LABEL}
            rows={4}
            onChange={(event) => setNote(event.target.value)}
            className="mt-3 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saveNote.isPending}
              onClick={() => {
                void saveNote.mutateAsync({
                  id: lead.id,
                  commercialNote: note,
                });
              }}
            >
              {saveNote.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
            {canHandoff ? (
              <Button
                type="button"
                size="sm"
                disabled={handoff.isPending}
                onClick={() => {
                  void handoff.mutateAsync(lead.id).then((result) => {
                    setOptimisticReadyAt(
                      result.managerCommercialInputReadyAt ??
                        new Date().toISOString(),
                    );
                  });
                }}
              >
                {handoff.isPending ? 'Отправка...' : HANDOFF_TO_HEAD_LABEL}
              </Button>
            ) : null}
            {handedOffAt ? (
              <p className="text-sm font-medium text-emerald-800">
                {HANDOFF_DONE_LABEL}
                <span className="ml-1 font-normal text-slate-600">
                  {formatDateTime(handedOffAt)}
                </span>
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-900">
          {lead.managerCommercialNote?.trim() || '—'}
        </p>
      )}
    </div>
  );
}

function CommercialQualificationPanel({
  leadId,
  qualification,
  currentSupplierId,
  currentQualityClassId,
  currentTargetDate,
}: {
  leadId: string;
  qualification?: LeadQualification | null;
  currentSupplierId?: string | null;
  currentQualityClassId?: string | null;
  currentTargetDate?: string | null;
}) {
  const suppliersQuery = useSuppliers();
  const confirmCommercial = useConfirmLeadCommercialQualification();
  const [supplierId, setSupplierId] = useState(currentSupplierId ?? '');
  const [qualityClassId, setQualityClassId] = useState(
    currentQualityClassId ?? '',
  );
  const [targetDate, setTargetDate] = useState(
    toDateInputValue(currentTargetDate),
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
    label: qualityLineLabel(quality),
    description: quality.code ?? undefined,
  }));

  const canSubmit =
    Boolean(supplierId && qualityClassId) && !confirmCommercial.isPending;

  return (
    <div className="mt-6 border-t border-slate-200 pt-4">
      <h4 className="text-sm font-semibold text-slate-900">
        Коммерческая квалификация
      </h4>
      <p className="mt-1 text-xs text-slate-500">
        Коммерческий выбор не меняет потребность клиента.
      </p>
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
        <div>
          <SearchCombobox
            ariaLabel="Линейка"
            value={qualityClassId}
            onChange={setQualityClassId}
            options={qualityOptions}
            placeholder={QUALITY_LINE_PLACEHOLDER}
            searchPlaceholder="Поиск линейки"
            emptyLabel={QUALITY_LINES_NOT_FOUND}
            disabled={!supplierId || !panelTypeCode}
            loading={qualityQuery.isFetching}
          />
          {qualityQuery.isError ? (
            <p className="mt-1 text-sm text-red-600">
              {QUALITY_LINES_LOAD_ERROR_MESSAGE}
            </p>
          ) : null}
          {supplierId &&
          qualityQuery.isSuccess &&
          qualityClasses.length === 0 ? (
            <p className="mt-1 text-sm text-amber-700">
              {QUALITY_LINES_EMPTY_MESSAGE}
            </p>
          ) : null}
        </div>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Срок реализации
          </span>
          <input
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
        </label>
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
          const targetDateIso = dateInputToIso(targetDate);
          void confirmCommercial.mutateAsync({
            id: leadId,
            supplierId,
            qualityClassId,
            ...(targetDateIso ? { targetDate: targetDateIso } : {}),
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
  const router = useRouter();
  const leadQuery = useLead(leadId);
  const workspaceQuery = useLeadWorkspace(leadId);
  const calculationsQuery = useCalculationsByLead(leadId);
  const quotesQuery = useQuotes(leadId);
  const canReadUsers = user?.permissions.includes('users:read') ?? false;
  const { users, usersById } = useUsersList(canReadUsers);
  const createCall = useCreateLeadCall();
  const createNote = useCreateLeadNote();
  const assignOwner = useAssignLeadOwner();
  const convertToQuote = useConvertCalculationToQuote();
  const finalizeCalculation = useFinalizeCalculation();
  const updateQuoteStatus = useUpdateQuoteStatus();
  const updateQuoteCommercialTerms = useUpdateQuoteCommercialTerms();
  const recordClientAcceptance = useRecordQuoteClientAcceptance();
  const convertQuoteToDeal = useConvertQuoteToDeal();
  const downloadQuotePdf = useDownloadQuotePdf();
  const downloadQuoteDocx = useDownloadQuoteDocx();
  const approveQuotePricing = useApproveQuotePricing();
  const previewQuotePricing = usePreviewQuotePricing();
  const finalizeQuote = useFinalizeQuote();
  const createQuoteVersion = useCreateQuoteVersion();
  const loseLead = useLoseLead();
  const finalizedCalculationIds = useRef(new Set<string>());
  const [highlightUnapprovedQuoteId, setHighlightUnapprovedQuoteId] = useState<
    string | null
  >(null);

  const [tab, setTab] = useState<WorkspaceTab>('info');
  const [noteText, setNoteText] = useState('');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [ownerId, setOwnerId] = useState('');
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [unqualifyingLead, setUnqualifyingLead] = useState<Lead | null>(null);
  const [losingLead, setLosingLead] = useState<Lead | null>(null);
  const [rejectingQuote, setRejectingQuote] = useState<Quote | null>(null);
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
  const permissions = user?.permissions ?? [];
  const canCommercialQualify = permissions.includes('leads:commercial_qualify');
  const canWriteManagerNote = canWriteManagerCommercialNote(permissions);
  const canRunCalculation = canRunCommercialCalculation(permissions);
  const canConvertCalculation = canConvertCalculationToQuote(permissions);
  const waitingForCommercialCalculation = shouldWaitForCommercialCalculation({
    permissions,
    hasCalculation: calculations.length > 0,
    stage1Complete:
      lead?.status === 'QUALIFIED' || Boolean(qualification),
  });
  const source = lead?.source ?? workspace?.lead.source;
  const contactPresentation = resolveClientContactPresentation({
    client: mergeContactSources(lead?.client, workspace?.lead.client),
    contact: mergeContactSources(lead?.contact, workspace?.lead.contact),
  });
  const clientName =
    contactPresentation.clientName !== '—'
      ? contactPresentation.clientName
      : (lead?.title ?? 'Лид');

  const canAssign =
    Boolean(lead) &&
    canReadUsers &&
    Boolean(user?.permissions.includes('leads:assign'));

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

  const pendingQuoteAction = (quoteId: string): QuoteAction | null => {
    if (
      updateQuoteStatus.isPending &&
      updateQuoteStatus.variables?.id === quoteId
    ) {
      if (updateQuoteStatus.variables.status === 'sent') return 'send';
      if (updateQuoteStatus.variables.status === 'approved') return 'approve';
      return 'reject';
    }
    if (
      recordClientAcceptance.isPending &&
      recordClientAcceptance.variables === quoteId
    ) {
      return 'client-accept';
    }
    if (
      convertQuoteToDeal.isPending &&
      convertQuoteToDeal.variables === quoteId
    ) {
      return 'convert';
    }
    return null;
  };

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
              {lead.managerCommercialInputReadyAt ? (
                <span className="inline-flex rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  {HANDOFF_DONE_LABEL}
                </span>
              ) : null}
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
                  value={displayContactValue(contactPresentation.contactName)}
                />
                <Field
                  label="Телефон"
                  value={displayContactValue(contactPresentation.phone)}
                />
                <Field
                  label="Email"
                  value={displayContactValue(contactPresentation.email)}
                />
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
                  label="Адрес объекта"
                  value={lead.projectObject?.address}
                />
                <Field
                  label="Сделка"
                  value={resolveEntityName(lead.deal, lead.dealId)}
                />
                <Field label="Оценка суммы" value={formatMoney(lead.estimatedAmount)} />
              </div>
              <div className="mt-6 border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold text-slate-900">
                  {QUALIFICATION_CONTEXT_TITLE}
                </h4>
                <div className="mt-4">
                  <QualificationContext
                    qualification={qualification}
                    projectObject={lead.projectObject}
                    customerNeed={lead.needDescription}
                  />
                </div>
              </div>
              <ManagerCustomerNotePanel
                lead={lead}
                canWrite={canWriteManagerNote}
              />
              {commercialQualification ? (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Коммерческие данные
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Подтверждено руководителем на Stage 2
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field
                      label="Поставщик"
                      value={formatSupplierName(
                        commercialQualification.supplier?.code,
                        commercialQualification.supplier?.name,
                        '—',
                      )}
                    />
                    <Field
                      label="Линейка"
                      value={
                        commercialQualification.qualityClass
                          ? qualityLineLabel(commercialQualification.qualityClass)
                          : '—'
                      }
                    />
                    <Field
                      label="Срок реализации"
                      value={
                        lead.targetDate || commercialQualification.targetDate
                          ? formatDate(
                              lead.targetDate ??
                                commercialQualification.targetDate,
                            )
                          : '—'
                      }
                    />
                  </div>
                </div>
              ) : null}
              {canCommercialQualify && lead.status === 'QUALIFIED' ? (
                <CommercialQualificationPanel
                  leadId={lead.id}
                  qualification={qualification}
                  currentSupplierId={commercialQualification?.supplierId}
                  currentQualityClassId={
                    commercialQualification?.qualityClassId
                  }
                  currentTargetDate={
                    lead.targetDate ?? commercialQualification?.targetDate
                  }
                />
              ) : null}

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
                <Field label="Причина неквалификации" value={lead.unqualificationReason} />
                {lead.status === 'LOST' || lead.lostReasonCode ? (
                  <>
                    <Field
                      label="Причина проигрыша"
                      value={lossReasonLabel(lead.lostReasonCode)}
                    />
                    <Field label="Комментарий" value={lead.lostComment} />
                    <Field
                      label="Проигран"
                      value={lead.lostAt ? formatDateTime(lead.lostAt) : '—'}
                    />
                  </>
                ) : null}
                {waitingForCommercialCalculation ? (
                  <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {COMMERCIAL_CALCULATION_WAITING_COPY}
                  </p>
                ) : null}
                {user?.permissions.includes('leads:update') &&
                lead.status !== 'LOST' &&
                lead.status !== 'CONVERTED' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLosingLead(lead)}
                  >
                    Проигран
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={lead.status === 'UNQUALIFIED' || lead.status === 'LOST'}
                  onClick={() => setUnqualifyingLead(lead)}
                >
                  Не квалифицирован
                </Button>
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
          <section className="space-y-6 rounded border border-slate-200 bg-white p-5">
            <CalculationRequestPanel
              leadId={lead.id}
              clientId={lead.clientId}
              dealId={lead.dealId}
            />
            <div className="border-t border-slate-200 pt-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-950">Сохранённые расчёты</h3>
              {canRunCalculation ? (
                <Button type="button" size="sm" onClick={() => setIsCalculatorOpen(true)}>
                  {SAVED_CALCULATION_ACTION_LABEL}
                </Button>
              ) : null}
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
                        <td className="px-3 py-2 text-slate-700">{summary.thickness}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {formatNumber(summary.sheets)}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {formatMoney(summary.total)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {canConvertCalculation ? (
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
                          ) : (
                            <span className="text-xs text-slate-500">Только просмотр</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!calculationsQuery.isLoading && calculations.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  {waitingForCommercialCalculation
                    ? COMMERCIAL_CALCULATION_WAITING_COPY
                    : 'Расчётов пока нет.'}
                </div>
              ) : null}
            </div>
            </div>
          </section>
        ) : null}

        {tab === 'quotes' ? (
          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">
                  Коммерческие предложения
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  История предложений по этому лиду
                </p>
              </div>
            </div>
            {quotesQuery.isLoading ? (
              <p className="mt-4 text-sm text-slate-600">Загрузка КП...</p>
            ) : null}
            {quotesQuery.isError ? (
              <div className="mt-4 flex items-center justify-between gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <span>Не удалось загрузить КП.</span>
                <Button type="button" variant="outline" size="sm" onClick={() => void quotesQuery.refetch()}>
                  Повторить
                </Button>
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              {quotes.map((quote, index) => {
                const manager = usersById.get(quote.managerId);
                return (
                  <QuoteCard
                    key={quote.id}
                    quote={quote}
                    currentUserId={user?.id}
                    permissions={user?.permissions ?? []}
                    managerName={manager ? formatPersonName(manager, manager.email) : undefined}
                    isLatest={index === 0}
                    conversionAllowed={
                      lead?.status === 'QUALIFIED' &&
                      !lead.dealId &&
                      (qualification?.stockOnly !== true ||
                        Boolean(quote.clientAcceptedAt))
                    }
                    pendingAction={pendingQuoteAction(quote.id)}
                    onSend={() => {
                      void updateQuoteStatus.mutateAsync({ id: quote.id, status: 'sent' }).catch(() => undefined);
                    }}
                    onApprove={() => {
                      void updateQuoteStatus.mutateAsync({ id: quote.id, status: 'approved' }).catch(() => undefined);
                    }}
                    onReject={() => setRejectingQuote(quote)}
                    onClientAccept={() => {
                      void recordClientAcceptance.mutateAsync(quote.id).catch(() => undefined);
                    }}
                    onConvert={() => {
                      void convertQuoteToDeal
                        .mutateAsync(quote.id)
                        .then((result) => {
                          if (result.dealId) {
                            router.push(
                              dealWorkspaceHref({ dealId: result.dealId }),
                            );
                          }
                        })
                        .catch(() => undefined);
                    }}
                    onDownloadPdf={() => {
                      void downloadQuotePdf
                        .mutateAsync(quote.id)
                        .catch(() => undefined);
                    }}
                    pdfPending={
                      downloadQuotePdf.isPending &&
                      downloadQuotePdf.variables === quote.id
                    }
                    onDownloadDocx={() => {
                      void downloadQuoteDocx
                        .mutateAsync(quote.id)
                        .catch(() => undefined);
                    }}
                    docxPending={
                      downloadQuoteDocx.isPending &&
                      downloadQuoteDocx.variables === quote.id
                    }
                    onSaveCommercialTerms={(payload) =>
                      updateQuoteCommercialTerms.mutateAsync({
                        id: quote.id,
                        ...payload,
                      })
                    }
                    termsPending={
                      updateQuoteCommercialTerms.isPending &&
                      updateQuoteCommercialTerms.variables?.id === quote.id
                    }
                    onApprovePricing={(items) =>
                      approveQuotePricing
                        .mutateAsync({ id: quote.id, items })
                        .catch(async (error) => {
                          if (isQuoteTermsLockedError(error)) {
                            await quotesQuery.refetch();
                          }
                        })
                    }
                    onPreviewPricing={(items) =>
                      previewQuotePricing.mutateAsync({ id: quote.id, items })
                    }
                    pricingPending={
                      approveQuotePricing.isPending &&
                      approveQuotePricing.variables?.id === quote.id
                    }
                    pricingPreviewPending={
                      previewQuotePricing.isPending &&
                      previewQuotePricing.variables?.id === quote.id
                    }
                    onFinalize={async () => {
                      try {
                        await finalizeQuote.mutateAsync(quote.id);
                        setHighlightUnapprovedQuoteId(null);
                      } catch (error) {
                        if (getApiErrorCode(error) === QUOTE_PRICE_NOT_APPROVED) {
                          setHighlightUnapprovedQuoteId(quote.id);
                        }
                        if (isQuoteTermsLockedError(error)) {
                          await quotesQuery.refetch();
                        }
                      }
                    }}
                    onCreateVersion={() =>
                      createQuoteVersion.mutateAsync(quote.id)
                    }
                    createVersionPending={
                      createQuoteVersion.isPending &&
                      createQuoteVersion.variables === quote.id
                    }
                    finalizePending={
                      finalizeQuote.isPending &&
                      finalizeQuote.variables === quote.id
                    }
                    highlightUnapproved={highlightUnapprovedQuoteId === quote.id}
                  />
                );
              })}
              {!quotesQuery.isLoading && !quotesQuery.isError && quotes.length === 0 ? (
                <div className="border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
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
      <LoseOpportunityModal
        isOpen={Boolean(losingLead)}
        title={losingLead?.title ?? ''}
        entityLabel="лид"
        pending={loseLead.isPending}
        error={
          loseLead.isError ? getErrorMessage(loseLead.error) : null
        }
        onClose={() => setLosingLead(null)}
        onSubmit={async (payload) => {
          if (!losingLead) {
            return;
          }
          await loseLead.mutateAsync({
            id: losingLead.id,
            reason: payload.reason,
            comment: payload.comment,
          });
          setLosingLead(null);
        }}
      />
      {rejectingQuote ? (
        <RejectQuoteModal
          quoteId={rejectingQuote.id.slice(0, 8).toUpperCase()}
          isPending={
            updateQuoteStatus.isPending &&
            updateQuoteStatus.variables?.id === rejectingQuote.id
          }
          onCancel={() => setRejectingQuote(null)}
          onSubmit={async (rejectionReason) => {
            await updateQuoteStatus.mutateAsync({
              id: rejectingQuote.id,
              status: 'rejected',
              rejectionReason,
            });
            setRejectingQuote(null);
          }}
        />
      ) : null}
      {isCalculatorOpen && canRunCalculation ? (
        <HplCalculatorWizard
          leadId={lead.id}
          qualification={qualification ?? workspace?.requirementPrefill ?? lead.qualification}
          commercialSupplierId={commercialQualification?.supplierId}
          commercialQualityClassId={commercialQualification?.qualityClassId}
          onClose={() => setIsCalculatorOpen(false)}
          onSuccess={() => setIsCalculatorOpen(false)}
        />
      ) : null}
    </>
  );
}
