import type { Deal, DealStage } from '@/hooks/use-deals';
import type { Lead } from '@/hooks/use-leads';
import type { Task } from '@/hooks/use-tasks';

export const activeDealStages: DealStage[] = [
  'QUALIFICATION',
  'HPL_SELECTION',
  'OFFER_PREPARATION',
  'NEGOTIATION',
  'AGREEMENT_PENDING',
  'PAYMENT_PREPARATION',
  'SHIPPED',
];

export type DashboardVisibility = {
  leads: boolean;
  commercialAttention: boolean;
  tasks: boolean;
  deals: boolean;
  quotes: boolean;
  broadLeads: boolean;
  broadTasks: boolean;
  broadDeals: boolean;
  broadQuotes: boolean;
};

export function getDashboardVisibility(
  permissions: readonly string[],
): DashboardVisibility {
  const has = (permission: string): boolean => permissions.includes(permission);

  return {
    leads: has('leads:read'),
    commercialAttention:
      has('leads:read') && has('leads:commercial_qualify'),
    tasks: has('tasks:read'),
    deals: has('deals:read'),
    quotes: has('quotes:read'),
    broadLeads: has('leads:read_all'),
    broadTasks: has('tasks:read_all'),
    broadDeals: has('deals:read_all'),
    broadQuotes: has('quotes:read_all'),
  };
}

export function isCompleteList<T>(items: readonly T[], total: number): boolean {
  return items.length >= total;
}

export type LeadAttentionItem = {
  lead: Lead;
  reason: 'commercial' | 'new';
};

export function buildLeadAttention(
  newLeads: readonly Lead[],
  qualifiedLeads: readonly Lead[],
  includeCommercial: boolean,
): LeadAttentionItem[] {
  const items = new Map<string, LeadAttentionItem>();

  if (includeCommercial) {
    for (const lead of qualifiedLeads) {
      if (lead.commercialQualification?.status !== 'CONFIRMED') {
        items.set(lead.id, { lead, reason: 'commercial' });
      }
    }
  }

  for (const lead of newLeads) {
    if (!items.has(lead.id)) {
      items.set(lead.id, { lead, reason: 'new' });
    }
  }

  return Array.from(items.values()).sort((left, right) => {
    if (left.reason !== right.reason) {
      return left.reason === 'commercial' ? -1 : 1;
    }

    return Date.parse(right.lead.createdAt) - Date.parse(left.lead.createdAt);
  });
}

const taskUrgency: Record<Task['computedStatus'], number> = {
  CRITICAL_OVERDUE: 0,
  OVERDUE: 1,
  BLOCKED: 2,
  TODAY: 3,
  WARNING: 4,
  ON_TIME: 5,
};

export function sortDashboardTasks(tasks: readonly Task[]): Task[] {
  const unique = new Map(tasks.map((task) => [task.id, task]));

  return Array.from(unique.values()).sort((left, right) => {
    const urgency = taskUrgency[left.computedStatus] - taskUrgency[right.computedStatus];
    if (urgency !== 0) {
      return urgency;
    }

    return Date.parse(left.dueDate) - Date.parse(right.dueDate);
  });
}

export type DealPipelineSummary = {
  isComplete: boolean;
  activeTotal: number | null;
  byStage: Record<DealStage, number> | null;
  recentActive: Deal[];
};

export function deriveDealPipeline(
  deals: readonly Deal[],
  total: number,
): DealPipelineSummary {
  const isComplete = isCompleteList(deals, total);
  const recentActive = deals
    .filter((deal) => activeDealStages.includes(deal.stage))
    .slice(0, 5);

  if (!isComplete) {
    return { isComplete, activeTotal: null, byStage: null, recentActive };
  }

  const byStage = Object.fromEntries(
    [...activeDealStages, 'WON', 'LOST'].map((stage) => [stage, 0]),
  ) as Record<DealStage, number>;

  for (const deal of deals) {
    byStage[deal.stage] += 1;
  }

  return {
    isComplete,
    activeTotal: activeDealStages.reduce(
      (sum, stage) => sum + byStage[stage],
      0,
    ),
    byStage,
    recentActive,
  };
}
