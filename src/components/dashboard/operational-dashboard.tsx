'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  RefreshCw,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import type { Deal, DealStage } from '@/hooks/use-deals';
import {
  useDashboardDeals,
  useDashboardLeads,
  useDashboardQuotes,
  useDashboardTasks,
} from '@/hooks/use-dashboard';
import type { Lead } from '@/hooks/use-leads';
import type { Task } from '@/hooks/use-tasks';
import { formatMoney, normalizeCurrency } from '@/lib/currency';
import {
  activeDealStages,
  buildLeadAttention,
  deriveDealPipeline,
  getDashboardVisibility,
  isCompleteList,
  sortDashboardTasks,
} from '@/lib/dashboard';
import { formatPersonName, resolveEntityName } from '@/lib/display-names';
import { formatDateTime } from '@/lib/format';
import {
  dealStageLabels,
  enumLabel,
  taskComputedStatusLabels,
  taskTypeLabels,
} from '@/lib/labels';
import {
  compactQuoteId,
  quoteStatusClassNames,
  quoteStatusLabels,
} from '@/lib/quote-presentation';
import { MIXED_CURRENCY_TOTAL_HINT, quoteUsesMixedCurrencies } from '@/lib/quote-pricing';
import type { Quote } from '@/types/hpl';

const KPI_ICON_CLASS = 'h-4 w-4';

export function OperationalDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadedAt] = useState(() => new Date());
  const visibility = useMemo(
    () => getDashboardVisibility(user?.permissions ?? []),
    [user?.permissions],
  );
  const userId = user?.id;
  const nowIso = loadedAt.toISOString();

  const newLeadsQuery = useDashboardLeads(
    { userId, section: 'new', enabled: visibility.leads },
    { status: 'NEW', page: 1, limit: 6 },
  );
  const qualifiedLeadsQuery = useDashboardLeads(
    {
      userId,
      section: 'commercial-attention',
      enabled: visibility.commercialAttention,
    },
    { status: 'QUALIFIED', page: 1, limit: 100 },
  );
  const criticalTasksQuery = useDashboardTasks(
    { userId, section: 'critical-overdue', enabled: visibility.tasks },
    { computedStatus: 'CRITICAL_OVERDUE', page: 1, limit: 6 },
  );
  const overdueTasksQuery = useDashboardTasks(
    { userId, section: 'overdue', enabled: visibility.tasks },
    { computedStatus: 'OVERDUE', page: 1, limit: 6 },
  );
  const upcomingTasksQuery = useDashboardTasks(
    { userId, section: 'upcoming', enabled: visibility.tasks },
    { status: 'PENDING', dateFrom: nowIso, page: 1, limit: 6 },
  );
  const dealsQuery = useDashboardDeals(
    { userId, section: 'pipeline', enabled: visibility.deals },
    { page: 1, limit: 100 },
  );
  const quotesQuery = useDashboardQuotes(
    { userId, section: 'recent', enabled: visibility.quotes },
    { page: 1, limit: 6 },
  );

  const queries = [
    newLeadsQuery,
    qualifiedLeadsQuery,
    criticalTasksQuery,
    overdueTasksQuery,
    upcomingTasksQuery,
    dealsQuery,
    quotesQuery,
  ];
  const enabledQueries = queries.filter((query) => query.fetchStatus !== 'idle' || query.data);
  const isInitialLoading =
    enabledQueries.length > 0 &&
    enabledQueries.every((query) => !query.data) &&
    enabledQueries.some((query) => query.isLoading);
  const isRefreshing = queries.some((query) => query.isFetching);

  const qualifiedItems = qualifiedLeadsQuery.data?.items ?? [];
  const commercialListComplete = qualifiedLeadsQuery.data
    ? isCompleteList(qualifiedItems, qualifiedLeadsQuery.data.total)
    : false;
  const commercialAttentionCount = commercialListComplete
    ? qualifiedItems.filter(
        (lead) => lead.commercialQualification?.status !== 'CONFIRMED',
      ).length
    : null;
  const leadAttention = buildLeadAttention(
    newLeadsQuery.data?.items ?? [],
    qualifiedItems,
    visibility.commercialAttention,
  ).slice(0, 8);

  const taskItems = sortDashboardTasks([
    ...(criticalTasksQuery.data?.items ?? []),
    ...(overdueTasksQuery.data?.items ?? []),
    ...(upcomingTasksQuery.data?.items ?? []),
  ]).slice(0, 8);
  const overdueTotal =
    criticalTasksQuery.data && overdueTasksQuery.data
      ? criticalTasksQuery.data.total + overdueTasksQuery.data.total
      : null;

  const dealPipeline = deriveDealPipeline(
    dealsQuery.data?.items ?? [],
    dealsQuery.data?.total ?? 0,
  );
  const hasOperationalAccess =
    visibility.leads || visibility.tasks || visibility.deals || visibility.quotes;

  const refresh = (): void => {
    if (userId) {
      void queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
    }
  };

  if (isInitialLoading) {
    return <DashboardLoading />;
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Рабочий обзор</h2>
          <p className="mt-1 text-sm text-slate-600">
            Приоритеты и текущая коммерческая работа в доступной вам области.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isRefreshing}
          onClick={refresh}
        >
          <RefreshCw className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
          Обновить
        </Button>
      </div>

      {!hasOperationalAccess ? (
        <div className="border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Для вашей учётной записи нет доступных операционных разделов dashboard.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {visibility.leads ? (
          <KpiCard
            label="Новые лиды"
            value={queryValue(newLeadsQuery.data?.total, newLeadsQuery.isError)}
            scope={visibility.broadLeads ? 'Доступны по всей команде' : 'Только ваши лиды'}
            href="/leads"
            icon={<UsersRound className={KPI_ICON_CLASS} />}
            tone="blue"
          />
        ) : null}
        {visibility.commercialAttention && commercialAttentionCount !== null ? (
          <KpiCard
            label="Ждут коммерческого решения"
            value={String(commercialAttentionCount)}
            scope="Точный счётчик полного списка"
            href="/leads"
            icon={<AlertTriangle className={KPI_ICON_CLASS} />}
            tone="amber"
          />
        ) : null}
        {visibility.tasks ? (
          <KpiCard
            label="Просроченные задачи"
            value={queryValue(
              overdueTotal,
              criticalTasksQuery.isError || overdueTasksQuery.isError,
            )}
            scope={visibility.broadTasks ? 'В доступной команде' : 'Только ваши задачи'}
            href="/tasks"
            icon={<Clock3 className={KPI_ICON_CLASS} />}
            tone="red"
          />
        ) : null}
        {visibility.tasks ? (
          <KpiCard
            label="Предстоящие задачи"
            value={queryValue(upcomingTasksQuery.data?.total, upcomingTasksQuery.isError)}
            scope="Ожидающие со сроком впереди"
            href="/tasks"
            icon={<CheckCircle2 className={KPI_ICON_CLASS} />}
            tone="green"
          />
        ) : null}
        {visibility.deals ? (
          <KpiCard
            label={dealPipeline.activeTotal === null ? 'Сделки в доступе' : 'Активные сделки'}
            value={queryValue(
              dealPipeline.activeTotal ?? dealsQuery.data?.total,
              dealsQuery.isError,
            )}
            scope={
              dealPipeline.activeTotal === null
                ? 'Backend total без неполной разбивки'
                : visibility.broadDeals
                  ? 'По доступной команде'
                  : 'Только ваши сделки'
            }
            href="/deals"
            icon={<BriefcaseBusiness className={KPI_ICON_CLASS} />}
            tone="slate"
          />
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {visibility.leads ? (
          <LeadAttentionSection
            items={leadAttention}
            isError={newLeadsQuery.isError || qualifiedLeadsQuery.isError}
            commercialListComplete={commercialListComplete}
            commercialEnabled={visibility.commercialAttention}
          />
        ) : null}
        {visibility.tasks ? (
          <TaskSection
            tasks={taskItems}
            broadScope={visibility.broadTasks}
            isError={
              criticalTasksQuery.isError ||
              overdueTasksQuery.isError ||
              upcomingTasksQuery.isError
            }
          />
        ) : null}
      </div>

      {visibility.deals ? (
        <PipelineSection
          deals={dealPipeline.recentActive}
          byStage={dealPipeline.byStage}
          total={dealsQuery.data?.total ?? 0}
          isComplete={dealPipeline.isComplete}
          isError={dealsQuery.isError}
        />
      ) : null}

      {visibility.quotes ? (
        <QuoteActivitySection
          quotes={quotesQuery.data?.items ?? []}
          broadScope={visibility.broadQuotes}
          isError={quotesQuery.isError}
        />
      ) : null}
    </div>
  );
}

function queryValue(value: number | null | undefined, isError: boolean): string {
  if (isError || value === null || value === undefined) {
    return '—';
  }
  return new Intl.NumberFormat('ru-RU').format(value);
}

type KpiTone = 'blue' | 'amber' | 'red' | 'green' | 'slate';

const kpiToneClasses: Record<KpiTone, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  red: 'border-red-200 bg-red-50 text-red-700',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  slate: 'border-slate-200 bg-slate-100 text-slate-700',
};

function KpiCard({
  label,
  value,
  scope,
  href,
  icon,
  tone,
}: {
  label: string;
  value: string;
  scope: string;
  href: string;
  icon: ReactNode;
  tone: KpiTone;
}) {
  return (
    <Link href={href} className="rounded border border-slate-200 bg-white p-4 hover:border-slate-400">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-slate-600">{label}</div>
        <span className={`rounded border p-1.5 ${kpiToneClasses[tone]}`}>{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{scope}</div>
    </Link>
  );
}

function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <Link href={href} className="text-sm font-medium text-slate-600 underline underline-offset-4">
        {linkLabel}
      </Link>
    </div>
  );
}

function LeadAttentionSection({
  items,
  isError,
  commercialListComplete,
  commercialEnabled,
}: {
  items: Array<{ lead: Lead; reason: 'commercial' | 'new' }>;
  isError: boolean;
  commercialListComplete: boolean;
  commercialEnabled: boolean;
}) {
  return (
    <section className="border-t border-slate-300 pt-4">
      <SectionHeader title="Требуют внимания" href="/leads" linkLabel="Все лиды" />
      {commercialEnabled && !commercialListComplete ? (
        <p className="mt-2 text-xs text-amber-700">
          Коммерческий список превышает 100 записей: показаны только последние без общего счётчика.
        </p>
      ) : null}
      {isError ? <SectionError text="Часть данных по лидам недоступна." /> : null}
      <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
        {items.map(({ lead, reason }) => (
          <Link
            key={lead.id}
            href={`/leads/${lead.id}`}
            className="flex items-center justify-between gap-3 bg-white px-3 py-3 hover:bg-slate-50"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-950">{lead.title}</div>
              <div className="mt-0.5 truncate text-xs text-slate-500">
                {resolveEntityName(lead.client, lead.clientId)} · {formatDateTime(lead.createdAt)}
              </div>
            </div>
            <span
              className={`shrink-0 rounded border px-2 py-0.5 text-xs font-semibold ${
                reason === 'commercial'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
              }`}
            >
              {reason === 'commercial' ? 'Коммерческое решение' : 'Новый лид'}
            </span>
          </Link>
        ))}
        {!isError && items.length === 0 ? <SectionEmpty text="Нет лидов, требующих внимания." /> : null}
      </div>
    </section>
  );
}

function TaskSection({ tasks, broadScope, isError }: { tasks: Task[]; broadScope: boolean; isError: boolean }) {
  return (
    <section className="border-t border-slate-300 pt-4">
      <SectionHeader title="Задачи в фокусе" href="/tasks" linkLabel="Все задачи" />
      <p className="mt-1 text-xs text-slate-500">
        {broadScope ? 'Доступные командные задачи' : 'Ваши задачи'}: просроченные выше предстоящих.
      </p>
      {isError ? <SectionError text="Часть данных по задачам недоступна." /> : null}
      <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
        {tasks.map((task) => (
          <Link
            key={task.id}
            href="/tasks"
            className="block bg-white px-3 py-3 hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-950">{task.title}</div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {enumLabel(taskTypeLabels, task.type)} · {task.relatedEntity?.title ?? task.relatedType}
                </div>
              </div>
              <TaskTiming task={task} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
              <span>{formatDateTime(task.dueDate)}</span>
              {broadScope && task.assignee ? (
                <span>
                  {formatPersonName(
                    task.assignee,
                    task.assignee.email ?? undefined,
                  )}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
        {!isError && tasks.length === 0 ? <SectionEmpty text="Срочных и ближайших задач нет." /> : null}
      </div>
    </section>
  );
}

function TaskTiming({ task }: { task: Task }) {
  const urgent = task.computedStatus === 'OVERDUE' || task.computedStatus === 'CRITICAL_OVERDUE';
  return (
    <span
      className={`shrink-0 rounded border px-2 py-0.5 text-xs font-semibold ${
        urgent
          ? 'border-red-200 bg-red-50 text-red-700'
          : task.computedStatus === 'TODAY' || task.computedStatus === 'WARNING'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {enumLabel(taskComputedStatusLabels, task.computedStatus)}
    </span>
  );
}

function PipelineSection({
  deals,
  byStage,
  total,
  isComplete,
  isError,
}: {
  deals: Deal[];
  byStage: Record<DealStage, number> | null;
  total: number;
  isComplete: boolean;
  isError: boolean;
}) {
  const maxStage = byStage
    ? Math.max(1, ...activeDealStages.map((stage) => byStage[stage]))
    : 1;

  return (
    <section className="border-t border-slate-300 pt-4">
      <SectionHeader title="Сделки и текущий pipeline" href="/deals" linkLabel="Открыть сделки" />
      {isError ? <SectionError text="Данные по сделкам недоступны." /> : null}
      {!isError && !isComplete ? (
        <p className="mt-2 text-xs text-amber-700">
          В доступе {total} сделок. Точная разбивка по стадиям скрыта, потому что endpoint вернул только первые 100.
        </p>
      ) : null}
      {byStage ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {activeDealStages.map((stage) => (
            <div key={stage} className="border-l-2 border-slate-300 pl-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-slate-600">{dealStageLabels[stage]}</span>
                <span className="font-semibold text-slate-900">{byStage[stage]}</span>
              </div>
              <div className="mt-2 h-1.5 bg-slate-200">
                <div
                  className="h-full bg-slate-700"
                  style={{ width: `${(byStage[stage] / maxStage) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {deals.map((deal) => (
          <Link key={deal.id} href="/deals" className="rounded border border-slate-200 bg-white p-3 hover:border-slate-400">
            <div className="truncate text-sm font-medium text-slate-950">{deal.title}</div>
            <div className="mt-1 truncate text-xs text-slate-500">
              {resolveEntityName(deal.client, deal.clientId)}
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <span className="text-xs text-slate-600">{dealStageLabels[deal.stage]}</span>
              <span className="text-sm font-semibold text-slate-900">{formatMoney(deal.totalAmount)}</span>
            </div>
          </Link>
        ))}
        {!isError && deals.length === 0 ? <SectionEmpty text="Активных сделок нет." /> : null}
      </div>
    </section>
  );
}

function QuoteActivitySection({
  quotes,
  broadScope,
  isError,
}: {
  quotes: Quote[];
  broadScope: boolean;
  isError: boolean;
}) {
  return (
    <section className="border-t border-slate-300 pt-4">
      <SectionHeader title="Последние коммерческие предложения" href="/leads" linkLabel="Перейти к лидам" />
      <p className="mt-1 text-xs text-slate-500">
        {broadScope ? 'Последние КП в доступной области' : 'Последние созданные вами КП'}.
      </p>
      {isError ? <SectionError text="Последние КП недоступны." /> : null}
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {quotes.map((quote) => (
          <Link
            key={quote.id}
            href={quote.leadId ? `/leads/${quote.leadId}` : `/clients/${quote.clientId ?? ''}`}
            className="rounded border border-slate-200 bg-white p-3 hover:border-slate-400"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">КП · {compactQuoteId(quote.id)}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {quote.leadId
                    ? `Лид · ${quote.leadId.slice(0, 8).toUpperCase()}`
                    : 'КП'}
                </div>
              </div>
              <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${quoteStatusClassNames[quote.status]}`}>
                {quoteStatusLabels[quote.status]}
              </span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-xs text-slate-500">{formatDateTime(quote.createdAt)}</span>
              <span className="text-sm font-semibold text-slate-950">
                {quoteUsesMixedCurrencies(quote)
                  ? MIXED_CURRENCY_TOTAL_HINT
                  : formatMoney(quote.totalAmount, normalizeCurrency(quote.displayCurrency))}
              </span>
            </div>
          </Link>
        ))}
        {!isError && quotes.length === 0 ? <SectionEmpty text="Коммерческих предложений пока нет." /> : null}
      </div>
    </section>
  );
}

function SectionError({ text }: { text: string }) {
  return <div className="mt-3 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{text}</div>;
}

function SectionEmpty({ text }: { text: string }) {
  return <div className="col-span-full bg-white p-4 text-center text-sm text-slate-500">{text}</div>;
}

function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6" aria-label="Загрузка dashboard">
      <div className="h-12 w-72 animate-pulse bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-72 animate-pulse border-t border-slate-300 bg-white" />
        <div className="h-72 animate-pulse border-t border-slate-300 bg-white" />
      </div>
    </div>
  );
}
