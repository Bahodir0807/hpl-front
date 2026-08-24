import { describe, expect, it } from 'vitest';
import {
  HANDOFF_DONE_LABEL,
  HANDOFF_TO_HEAD_LABEL,
  MANAGER_CUSTOMER_NOTE_HEAD_LABEL,
  MANAGER_CUSTOMER_NOTE_LABEL,
  canWriteManagerCommercialNote,
} from './manager-commercial-note';

describe('manager commercial note access', () => {
  it('lets only MANAGER write the customer note', () => {
    expect(canWriteManagerCommercialNote(['quotes:client_accept'])).toBe(true);
    expect(
      canWriteManagerCommercialNote(['leads:commercial_qualify', 'quotes:approve']),
    ).toBe(false);
    expect(canWriteManagerCommercialNote(['leads:read_all'])).toBe(false);
    expect(canWriteManagerCommercialNote([])).toBe(false);
  });

  it('keeps Manager and HEAD labels distinct', () => {
    expect(MANAGER_CUSTOMER_NOTE_LABEL).toBe('Примечание / пожелания клиента');
    expect(MANAGER_CUSTOMER_NOTE_HEAD_LABEL).toBe(
      'Примечание менеджера / пожелания клиента',
    );
    expect(HANDOFF_TO_HEAD_LABEL).toBe('Отправить руководителю');
    expect(HANDOFF_DONE_LABEL).toBe('Передано руководителю');
  });
});
