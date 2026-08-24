export const MANAGER_CUSTOMER_NOTE_LABEL = 'Примечание / пожелания клиента';
export const MANAGER_CUSTOMER_NOTE_HEAD_LABEL =
  'Примечание менеджера / пожелания клиента';
export const MANAGER_CUSTOMER_NOTE_HELPER =
  'Укажите пожелания клиента, условия, комментарии или информацию, которую нужно учесть при подготовке КП.';
export const HANDOFF_TO_HEAD_LABEL = 'Отправить руководителю';
export const HANDOFF_DONE_LABEL = 'Передано руководителю';
export const MANAGER_NOTE_SAVED_TOAST = 'Примечание сохранено';
export const HANDOFF_SUCCESS_TOAST = 'Данные переданы руководителю';

const MANAGER_COMMERCIAL_NOTE_PERMISSION = 'quotes:client_accept';

export function canWriteManagerCommercialNote(
  permissions: readonly string[] | null | undefined,
): boolean {
  return Boolean(permissions?.includes(MANAGER_COMMERCIAL_NOTE_PERMISSION));
}
