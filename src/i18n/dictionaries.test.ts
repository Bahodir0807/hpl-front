import { describe, expect, it } from 'vitest';
import { collectMessageKeys } from './translate';
import { dictionaries } from './dictionaries';
import { createTranslator } from './translate';
import { ru } from './ru';

describe('translation dictionaries', () => {
  it('keeps ru, uz, and en keys in the same structure', () => {
    const ruKeys = collectMessageKeys(dictionaries.ru).sort();
    const uzKeys = collectMessageKeys(dictionaries.uz).sort();
    const enKeys = collectMessageKeys(dictionaries.en).sort();

    expect(uzKeys).toEqual(ruKeys);
    expect(enKeys).toEqual(ruKeys);
    expect(ruKeys).toContain('theme.label');
    expect(ruKeys).toContain('dashboard.dealsTotalUnscoped');
    expect(ruKeys).not.toContain('dashboard.backendTotal');
    expect(uzKeys).toContain('calculations.sendToHead');
    expect(enKeys).toContain('calculations.sendToHead');
  });

  it('throws in tests when a translation key is missing', () => {
    const t = createTranslator(ru);
    expect(() => t('does.not.exist')).toThrow(/Missing translation/);
  });
});
