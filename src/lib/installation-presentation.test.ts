import { describe, expect, it } from 'vitest';
import type { Deal, DealInstallation } from '@/hooks/use-deals';
import {
  canAssessInstallation,
  canInstallerConfirmInstallation,
  canScheduleInstallation,
  canStartInstallation,
  canSupervisorConfirmInstallation,
  DISTINCT_INSTALLATION_ACTORS_COPY,
  distinctUserBlockMessage,
  installationJobNeedsAttention,
  installationJobTitle,
  installationStatusLabel,
  INSTALLATION_STATUSES,
  shouldShowInstallerConfirmAction,
  shouldShowScheduleControls,
  shouldShowStartAction,
  shouldShowSupervisorConfirmAction,
} from './installation-presentation';

const installer = {
  id: 'installer-1',
  roles: ['INSTALLER'],
  permissions: ['deals:read', 'installation:assess', 'installation:confirm_work'],
};

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

const dual = {
  id: 'both-1',
  roles: ['INSTALLER', 'HEAD'],
  permissions: [
    'installation:confirm_work',
    'installation:confirm_supervisor',
    'installation:schedule',
    'installation:assess',
  ],
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

  it('allows HEAD and DIRECTOR to schedule, not INSTALLER/MANAGER/ADMIN-only', () => {
    expect(canScheduleInstallation(head)).toBe(true);
    expect(canScheduleInstallation(director)).toBe(true);
    expect(canScheduleInstallation(installer)).toBe(false);
    expect(canScheduleInstallation(manager)).toBe(false);
    expect(canScheduleInstallation(admin)).toBe(false);
    expect(shouldShowScheduleControls(head, job())).toBe(true);
    expect(shouldShowScheduleControls(installer, job())).toBe(false);
  });

  it('exposes assessment to INSTALLER, HEAD and DIRECTOR only', () => {
    expect(canAssessInstallation(installer)).toBe(true);
    expect(canAssessInstallation(head)).toBe(true);
    expect(canAssessInstallation(director)).toBe(true);
    expect(canAssessInstallation(manager)).toBe(false);
    expect(canAssessInstallation(admin)).toBe(false);
  });

  it('exposes start and installer confirmation only to INSTALLER', () => {
    expect(canStartInstallation(installer)).toBe(true);
    expect(canInstallerConfirmInstallation(installer)).toBe(true);
    expect(shouldShowStartAction(installer, job())).toBe(true);
    expect(shouldShowStartAction(installer, job({ startedAt: '2026-08-20T10:00:00.000Z' }))).toBe(
      false,
    );
    expect(shouldShowStartAction(head, job())).toBe(false);
    expect(shouldShowInstallerConfirmAction(installer, job())).toBe(true);
    expect(shouldShowInstallerConfirmAction(head, job())).toBe(false);
    expect(shouldShowInstallerConfirmAction(admin, job())).toBe(false);
  });

  it('exposes supervisor confirmation only to HEAD and DIRECTOR', () => {
    expect(canSupervisorConfirmInstallation(head)).toBe(true);
    expect(canSupervisorConfirmInstallation(director)).toBe(true);
    expect(shouldShowSupervisorConfirmAction(head, job())).toBe(true);
    expect(shouldShowSupervisorConfirmAction(installer, job())).toBe(false);
    expect(shouldShowSupervisorConfirmAction(manager, job())).toBe(false);
    expect(shouldShowSupervisorConfirmAction(admin, job())).toBe(false);
  });

  it('blocks the same user from occupying both confirmation slots in the UI', () => {
    const afterInstaller = job({
      installerConfirmedAt: '2026-08-20T10:00:00.000Z',
      installerConfirmedById: dual.id,
    });

    expect(shouldShowSupervisorConfirmAction(dual, afterInstaller)).toBe(false);
    expect(distinctUserBlockMessage(dual, afterInstaller)).toBe(
      DISTINCT_INSTALLATION_ACTORS_COPY,
    );
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
