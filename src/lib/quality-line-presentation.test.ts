import { describe, expect, it } from 'vitest';
import {
  QUALITY_LINE_PLACEHOLDER,
  QUALITY_LINES_EMPTY_MESSAGE,
  QUALITY_LINES_NOT_FOUND,
  qualityLineLabel,
} from './quality-line-presentation';

describe('quality line presentation', () => {
  it('maps canonical codes to Russian product-line names', () => {
    expect(qualityLineLabel({ code: 'economy' })).toBe('Эконом');
    expect(qualityLineLabel({ code: 'medium' })).toBe('Медиум');
    expect(qualityLineLabel({ code: 'premium' })).toBe('Премиум');
  });

  it('prefers nameRu over English names and never renders a raw id', () => {
    expect(
      qualityLineLabel({
        code: 'economy',
        nameRu: 'Эконом',
        name: 'Economy',
      }),
    ).toBe('Эконом');
    expect(
      qualityLineLabel({
        code: 'q-economy-uuid',
        nameRu: 'Эконом',
      }),
    ).toBe('Эконом');
  });

  it('does not fall back to a raw id when a name exists', () => {
    expect(
      qualityLineLabel({
        code: 'economy',
        nameRu: '',
        name: 'should-not-win',
      }),
    ).toBe('Эконом');
  });

  it('uses a neutral quality placeholder instead of advertising all three lines', () => {
    expect(QUALITY_LINE_PLACEHOLDER).toBe('Выберите линейку');
    expect(QUALITY_LINE_PLACEHOLDER).not.toContain('Эконом / Медиум / Премиум');
  });

  it('keeps the empty-mapping copy for Stage 2', () => {
    expect(QUALITY_LINES_EMPTY_MESSAGE).toBe(
      'Для выбранного поставщика и типа HPL не настроена доступная линейка.',
    );
    expect(QUALITY_LINES_NOT_FOUND).toBe('Линейки не найдены');
  });
});
