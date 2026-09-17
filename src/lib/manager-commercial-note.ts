import { ru } from '@/i18n/ru';

export const MANAGER_CUSTOMER_NOTE_LABEL = ru.calculations.managerNote;
export const MANAGER_CUSTOMER_NOTE_HEAD_LABEL =
  ru.calculations.managerNoteHead;
export const MANAGER_CUSTOMER_NOTE_HELPER = ru.calculations.managerNoteHelper;
export const HANDOFF_TO_HEAD_LABEL = ru.calculations.sendToHead;
export const HANDOFF_DONE_LABEL = ru.statuses.leadWorkflow.handedToHead;
export const MANAGER_NOTE_SAVED_TOAST = ru.toasts.noteSaved;
export const HANDOFF_SUCCESS_TOAST = ru.toasts.handedToHead;

const MANAGER_COMMERCIAL_NOTE_PERMISSION = 'quotes:client_accept';

export function canWriteManagerCommercialNote(
  permissions: readonly string[] | null | undefined,
): boolean {
  return Boolean(permissions?.includes(MANAGER_COMMERCIAL_NOTE_PERMISSION));
}
