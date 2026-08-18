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
});
