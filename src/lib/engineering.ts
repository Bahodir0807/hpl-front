import type { LeadStatus } from '@/hooks/use-leads';

export const ENGINEERING_READ_PERMISSION = 'engineering:read';
export const ENGINEERING_ASSIGN_PERMISSION = 'engineering:assign';
export const ENGINEERING_RETURN_PERMISSION = 'engineering:return';
export const ENGINEERING_COMPLETE_PERMISSION = 'engineering:complete';

const ASSIGNABLE_LEAD_STATUSES: readonly LeadStatus[] = [
  'NEW',
  'IN_PROGRESS',
  'QUALIFIED',
];

export function leadNeedsEngineer(qualification?: {
  installationRequired?: boolean | null;
  ventFacadeKitRequired?: boolean | null;
} | null): boolean {
  return (
    qualification?.installationRequired === true ||
    qualification?.ventFacadeKitRequired === true
  );
}

export function canAssignEngineerToLead(input: {
  permissions: readonly string[];
  status: LeadStatus;
  qualification?: {
    installationRequired?: boolean | null;
    ventFacadeKitRequired?: boolean | null;
  } | null;
}): boolean {
  return (
    input.permissions.includes(ENGINEERING_ASSIGN_PERMISSION) &&
    ASSIGNABLE_LEAD_STATUSES.includes(input.status) &&
    leadNeedsEngineer(input.qualification)
  );
}

export function prefersEngineerWorkspace(
  permissions: readonly string[] | null | undefined,
): boolean {
  const set = new Set(permissions ?? []);
  return (
    set.has(ENGINEERING_READ_PERMISSION) &&
    !set.has('leads:read_all') &&
    !set.has('leads:update')
  );
}
