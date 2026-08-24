import { describe, expect, it } from 'vitest';
import { resolveLeadWorkflowState } from './lead-workflow';

describe('resolveLeadWorkflowState', () => {
  it.each([
    ['NEW', undefined, 'Новая заявка', false],
    ['IN_PROGRESS', undefined, 'В работе', false],
    [
      'QUALIFIED',
      null,
      'Ожидает коммерческой квалификации',
      true,
    ],
    [
      'QUALIFIED',
      { id: 'commercial-qualification' },
      'Коммерчески квалифицирован',
      false,
    ],
    ['UNQUALIFIED', undefined, 'Не квалифицирован', false],
    ['CONVERTED', undefined, 'Конвертирован', false],
    ['LOST', undefined, 'Проигран', false],
  ] as const)(
    'maps %s to the expected frontend workflow state',
    (status, commercialQualification, label, needsCommercialAction) => {
      const result = resolveLeadWorkflowState({
        status,
        commercialQualification,
      });

      expect(result.label).toBe(label);
      expect(Boolean(result.needsCommercialAction)).toBe(
        needsCommercialAction,
      );
    },
  );

  it('marks Manager-to-HEAD handoff as waiting for commercial action', () => {
    const result = resolveLeadWorkflowState({
      status: 'QUALIFIED',
      commercialQualification: null,
      managerCommercialInputReadyAt: '2026-08-20T10:00:00.000Z',
    });

    expect(result.label).toBe('Передано руководителю');
    expect(result.needsCommercialAction).toBe(true);
  });
});
