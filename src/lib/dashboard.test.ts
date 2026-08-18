import { describe, expect, it } from 'vitest';
import type { Deal } from '@/hooks/use-deals';
import type { Lead } from '@/hooks/use-leads';
import type { Task } from '@/hooks/use-tasks';
import {
  buildLeadAttention,
  deriveDealPipeline,
  getDashboardVisibility,
  isCompleteList,
  sortDashboardTasks,
} from './dashboard';

const lead = (id: string, createdAt: string, commercial = false): Lead => ({
  id,
  title: id,
  source: 'manual',
  status: commercial ? 'QUALIFIED' : 'NEW',
  ownerId: 'manager-1',
  createdAt,
  updatedAt: createdAt,
  commercialQualification: commercial
    ? ({ status: 'CONFIRMED' } as Lead['commercialQualification'])
    : null,
});

const task = (
  id: string,
  computedStatus: Task['computedStatus'],
  dueDate: string,
): Task => ({
  id,
  title: id,
  type: 'CALL',
  status: 'PENDING',
  priority: 'MEDIUM',
  computedStatus,
  dueDate,
  originalDueDate: dueDate,
  rescheduleCount: 0,
  assigneeId: 'manager-1',
  createdById: 'manager-1',
  relatedType: 'Lead',
  relatedId: 'lead-1',
  createdAt: dueDate,
  updatedAt: dueDate,
});

const deal = (id: string, stage: Deal['stage']): Deal => ({
  id,
  title: id,
  stage,
  clientId: 'client-1',
  ownerId: 'manager-1',
  totalAmount: '100',
  createdAt: '2026-08-19T10:00:00.000Z',
  updatedAt: '2026-08-19T10:00:00.000Z',
});

describe('dashboard logic', () => {
  it('derives permission-aware section visibility', () => {
    expect(
      getDashboardVisibility([
        'leads:read',
        'leads:read_all',
        'leads:commercial_qualify',
        'tasks:read',
      ]),
    ).toMatchObject({
      leads: true,
      commercialAttention: true,
      tasks: true,
      deals: false,
      broadLeads: true,
    });
  });

  it('marks a list complete only when every backend row is loaded', () => {
    expect(isCompleteList([1, 2], 2)).toBe(true);
    expect(isCompleteList([1, 2], 3)).toBe(false);
  });

  it('prioritizes commercial attention before new leads', () => {
    const qualified = lead('qualified', '2026-08-18T10:00:00.000Z');
    qualified.status = 'QUALIFIED';

    expect(
      buildLeadAttention(
        [lead('new', '2026-08-19T10:00:00.000Z')],
        [qualified],
        true,
      ).map((item) => item.reason),
    ).toEqual(['commercial', 'new']);
  });

  it('excludes commercially confirmed leads from attention', () => {
    expect(
      buildLeadAttention([], [lead('confirmed', '2026-08-19T10:00:00.000Z', true)], true),
    ).toEqual([]);
  });

  it('sorts overdue tasks first and removes duplicates', () => {
    const upcoming = task('upcoming', 'ON_TIME', '2026-08-20T10:00:00.000Z');
    const critical = task('critical', 'CRITICAL_OVERDUE', '2026-08-18T10:00:00.000Z');

    expect(
      sortDashboardTasks([upcoming, critical, upcoming]).map((item) => item.id),
    ).toEqual(['critical', 'upcoming']);
  });

  it('derives exact active pipeline counts only from a complete list', () => {
    const complete = deriveDealPipeline(
      [deal('active', 'NEGOTIATION'), deal('won', 'WON')],
      2,
    );
    const partial = deriveDealPipeline([deal('active', 'NEGOTIATION')], 101);

    expect(complete.activeTotal).toBe(1);
    expect(complete.byStage?.NEGOTIATION).toBe(1);
    expect(partial.activeTotal).toBeNull();
    expect(partial.byStage).toBeNull();
  });
});
