import type { InstallationJob } from '@/hooks/use-installations';
import type { Deal, DealInstallation, InstallationStatus } from '@/hooks/use-deals';
import { hasRole, type RoleAccessUser } from '@/lib/role-access';

export const INSTALLATION_SCHEDULE_PERMISSION = 'installation:schedule';
export const INSTALLATION_ASSESS_PERMISSION = 'installation:assess';
export const INSTALLATION_CONFIRM_WORK_PERMISSION =
  'installation:confirm_work';
export const INSTALLATION_CONFIRM_SUPERVISOR_PERMISSION =
  'installation:confirm_supervisor';

export const INSTALLATION_STATUSES: InstallationStatus[] = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
];

export const installationStatusLabels: Record<InstallationStatus, string> = {
  SCHEDULED: 'Запланирован',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершён',
};

export const INSTALLER_EMPTY_JOBS_MESSAGE =
  'Нет монтажных работ, требующих действий.';

export const INSTALLATION_NOT_FOUND_MESSAGE = 'Монтажная работа не найдена.';

export const INSTALLATION_NOT_REQUIRED_COPY = 'Монтаж не требуется.';

export const MATERIAL_NOT_DELIVERED_MESSAGE =
  'Монтаж пока недоступен: материал ещё не доставлен клиенту.';

export const DISTINCT_INSTALLATION_ACTORS_COPY =
  'Подтверждение монтажника и подтверждение руководителя должны выполнить разные сотрудники.';

export type InstallationAuthorityUser = RoleAccessUser & {
  id?: string;
  permissions?: string[];
};

function permissionSet(user: InstallationAuthorityUser | null | undefined) {
  return new Set(user?.permissions ?? []);
}

export function isInstallationRequired(
  value: boolean | null | undefined,
): boolean {
  return value === true;
}

export function normalizeInstallationStatus(
  status?: string | null,
): InstallationStatus | null {
  if (!status) {
    return null;
  }

  if (status === 'SCHEDULED' || status === 'IN_PROGRESS' || status === 'COMPLETED') {
    return status;
  }

  return null;
}

export function installationStatusLabel(status?: string | null): string {
  const normalized = normalizeInstallationStatus(status);
  if (!normalized) {
    return status?.trim() ? status : '—';
  }

  return installationStatusLabels[normalized];
}

export function canScheduleInstallation(
  user: InstallationAuthorityUser | null | undefined,
): boolean {
  return (
    permissionSet(user).has(INSTALLATION_SCHEDULE_PERMISSION) &&
    hasRole(user, 'HEAD', 'DIRECTOR')
  );
}

export function canAssessInstallation(
  user: InstallationAuthorityUser | null | undefined,
): boolean {
  return (
    permissionSet(user).has(INSTALLATION_ASSESS_PERMISSION) &&
    hasRole(user, 'INSTALLER', 'HEAD', 'DIRECTOR')
  );
}

export function canStartInstallation(
  user: InstallationAuthorityUser | null | undefined,
): boolean {
  return (
    permissionSet(user).has(INSTALLATION_CONFIRM_WORK_PERMISSION) &&
    hasRole(user, 'INSTALLER')
  );
}

export function canInstallerConfirmInstallation(
  user: InstallationAuthorityUser | null | undefined,
): boolean {
  return canStartInstallation(user);
}

export function canSupervisorConfirmInstallation(
  user: InstallationAuthorityUser | null | undefined,
): boolean {
  return (
    permissionSet(user).has(INSTALLATION_CONFIRM_SUPERVISOR_PERMISSION) &&
    hasRole(user, 'HEAD', 'DIRECTOR')
  );
}

export function isInstallationCompleted(
  installation?: DealInstallation | null,
): boolean {
  if (!installation) {
    return false;
  }

  return (
    Boolean(installation.completedAt) ||
    normalizeInstallationStatus(installation.status) === 'COMPLETED'
  );
}

export function sameInstallationActor(
  left?: string | null,
  right?: string | null,
): boolean {
  return Boolean(left && right && left === right);
}

export function isDistinctUserViolation(installation?: DealInstallation | null) {
  return sameInstallationActor(
    installation?.installerConfirmedById,
    installation?.supervisorConfirmedById,
  );
}

export function shouldShowScheduleControls(
  user: InstallationAuthorityUser | null | undefined,
  installation?: DealInstallation | null,
): boolean {
  if (!canScheduleInstallation(user)) {
    return false;
  }

  return !isInstallationCompleted(installation);
}

export function shouldShowStartAction(
  user: InstallationAuthorityUser | null | undefined,
  installation?: DealInstallation | null,
): boolean {
  if (!canStartInstallation(user) || !installation) {
    return false;
  }

  if (isInstallationCompleted(installation) || installation.startedAt) {
    return false;
  }

  return true;
}

export function shouldShowInstallerConfirmAction(
  user: InstallationAuthorityUser | null | undefined,
  installation?: DealInstallation | null,
): boolean {
  if (!canInstallerConfirmInstallation(user) || !installation) {
    return false;
  }

  if (isInstallationCompleted(installation) || installation.installerConfirmedAt) {
    return false;
  }

  if (sameInstallationActor(user?.id, installation.supervisorConfirmedById)) {
    return false;
  }

  return true;
}

export function shouldShowSupervisorConfirmAction(
  user: InstallationAuthorityUser | null | undefined,
  installation?: DealInstallation | null,
): boolean {
  if (!canSupervisorConfirmInstallation(user) || !installation) {
    return false;
  }

  if (
    isInstallationCompleted(installation) ||
    installation.supervisorConfirmedAt
  ) {
    return false;
  }

  if (sameInstallationActor(user?.id, installation.installerConfirmedById)) {
    return false;
  }

  return true;
}

export function distinctUserBlockMessage(
  user: InstallationAuthorityUser | null | undefined,
  installation?: DealInstallation | null,
): string | null {
  if (!installation || !user?.id) {
    return null;
  }

  if (
    canSupervisorConfirmInstallation(user) &&
    !installation.supervisorConfirmedAt &&
    sameInstallationActor(user.id, installation.installerConfirmedById)
  ) {
    return DISTINCT_INSTALLATION_ACTORS_COPY;
  }

  if (
    canInstallerConfirmInstallation(user) &&
    !installation.installerConfirmedAt &&
    sameInstallationActor(user.id, installation.supervisorConfirmedById)
  ) {
    return DISTINCT_INSTALLATION_ACTORS_COPY;
  }

  if (isDistinctUserViolation(installation)) {
    return DISTINCT_INSTALLATION_ACTORS_COPY;
  }

  return null;
}

export function installationJobTitle(job: InstallationJob): string {
  return (
    job.deal.title?.trim() ||
    job.deal.client.name?.trim() ||
    `Монтаж ${compactInstallationId(job.id)}`
  );
}

export function installationJobClientName(job: InstallationJob): string {
  return job.deal.client.name?.trim() || compactInstallationId(job.deal.client.id);
}

export function isInstallationJobMaterialsDelivered(job: InstallationJob): boolean {
  return job.delivery.materialsDelivered;
}

export function isMaterialDeliveredToClient(
  deal?: Deal | null,
): boolean | null {
  if (!deal) {
    return null;
  }

  if (deal.fulfillmentSource === 'WAREHOUSE_STOCK') {
    const status = deal.order?.status;
    return status === 'SHIPPED' || status === 'COMPLETED';
  }

  const orders = (deal.supplierOrders ?? []).filter(
    (order) => order.status !== 'CANCELLED',
  );

  if (orders.length === 0) {
    if (deal.supplierOrder?.status) {
      return deal.supplierOrder.status === 'DELIVERED';
    }
    return false;
  }

  return orders.every((order) => order.status === 'DELIVERED');
}

export function installationJobNeedsAttention(input: {
  installationRequired?: boolean | null;
  installation?: DealInstallation | null;
  canSchedule: boolean;
}): boolean {
  if (!isInstallationRequired(input.installationRequired)) {
    return false;
  }

  if (isInstallationCompleted(input.installation)) {
    return false;
  }

  if (!input.installation) {
    return input.canSchedule;
  }

  return true;
}

export function compactInstallationId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function toDateTimeLocalValue(
  value?: string | Date | null,
): string {
  if (!value) {
    return '';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function dateTimeLocalToIso(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}
