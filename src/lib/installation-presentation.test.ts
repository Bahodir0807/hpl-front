import { describe, expect, it } from 'vitest';
import type { Deal, DealInstallation } from '@/hooks/use-deals';
import {
  canAssessInstallation,
  canScheduleInstallation,
  canSupervisorConfirmInstallation,
  installationJobNeedsAttention,
  installationJobTitle,
  installationStatusLabel,
  INSTALLATION_STATUSES,
  shouldShowScheduleControls,
  shouldShowSupervisorConfirmAction,
} from './installation-presentation';

const head = {
  id: 'head-1',
  roles: ['HEAD'],
  permissions: [
    'deals:read',
    'installation:schedule',
    'installation:assess',
    'installation:confirm_supervisor',
  ],
};

const director = {
  id: 'director-1',
  roles: ['DIRECTOR'],
  permissions: [
    'deals:read',
    'installation:schedule',
    'installation:assess',
    'installation:confirm_supervisor',
  ],
};

const manager = {
  id: 'manager-1',
  roles: ['MANAGER'],
  permissions: ['deals:read', 'deals:update'],
};

const admin = {
  id: 'admin-1',
  roles: ['ADMIN'],
  permissions: ['auth:me', 'users:read'],
};

function job(overrides: Partial<DealInstallation> = {}): DealInstallation {
  return {
    id: 'inst-1',
    dealId: 'deal-1',
    status: 'SCHEDULED',
    ...overrides,
  };
}

describe('installation presentation', () => {
  it('labels backend installation statuses in Russian', () => {
    expect(INSTALLATION_STATUSES).toEqual([
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
    ]);
    expect(installationStatusLabel('SCHEDULED')).toBe('Запланирован');
    expect(installationStatusLabel('IN_PROGRESS')).toBe('В работе');
    expect(installationStatusLabel('COMPLETED')).toBe('Завершён');
  });

  it('allows HEAD and DIRECTOR to schedule, not MANAGER/ADMIN-only', () => {
    expect(canScheduleInstallation(head)).toBe(true);
    expect(canScheduleInstallation(director)).toBe(true);
    expect(canScheduleInstallation(manager)).toBe(false);
    expect(canScheduleInstallation(admin)).toBe(false);
    expect(shouldShowScheduleControls(head, job())).toBe(true);
  });

  it('exposes assessment to HEAD and DIRECTOR only', () => {
    expect(canAssessInstallation(head)).toBe(true);
    expect(canAssessInstallation(director)).toBe(true);
    expect(canAssessInstallation(manager)).toBe(false);
    expect(canAssessInstallation(admin)).toBe(false);
  });

  it('exposes supervisor confirmation only to HEAD and DIRECTOR', () => {
    expect(canSupervisorConfirmInstallation(head)).toBe(true);
    expect(canSupervisorConfirmInstallation(director)).toBe(true);
    expect(shouldShowSupervisorConfirmAction(head, job())).toBe(true);
    expect(shouldShowSupervisorConfirmAction(manager, job())).toBe(false);
    expect(shouldShowSupervisorConfirmAction(admin, job())).toBe(false);
  });

  it('treats only incomplete required jobs as needing attention', () => {
    const deal = { installationRequiredSnapshot: true } as Deal;
    expect(
      installationJobNeedsAttention({
        installationRequired: deal.installationRequiredSnapshot,
        installation: job(),
        canSchedule: false,
      }),
    ).toBe(true);
    expect(
      installationJobNeedsAttention({
        installationRequired: true,
        installation: job({ status: 'COMPLETED', completedAt: '2026-08-20T12:00:00.000Z' }),
        canSchedule: true,
      }),
    ).toBe(false);
    expect(
      installationJobNeedsAttention({
        installationRequired: false,
        installation: null,
        canSchedule: true,
      }),
    ).toBe(false);
  });

  it('uses dedicated installation DTO display fields without a full Deal', () => {
    expect(
      installationJobTitle({
        id: 'inst-1',
        dealId: 'deal-foreign',
        status: 'SCHEDULED',
        deal: {
          id: 'deal-foreign',
          title: 'Фасад школы',
          client: { id: 'client-1', name: 'Школа №1' },
        },
        delivery: { materialsDelivered: true },
      }),
    ).toBe('Фасад школы');
  });
});
