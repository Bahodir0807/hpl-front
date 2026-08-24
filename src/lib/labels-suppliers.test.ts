import { describe, expect, it } from 'vitest';
import { formatSupplierName, supplierDisplayNames } from './labels';

describe('supplier presentation', () => {
  it('renders wuya as Вуя, not Буя', () => {
    expect(formatSupplierName('wuya', 'Wuya')).toBe('Вуя');
    expect(formatSupplierName('WUYA', 'Wuya')).toBe('Вуя');
    expect(formatSupplierName(undefined, 'Буя')).toBe('Вуя');
    expect(formatSupplierName(undefined, 'Wuya')).toBe('Вуя');
    expect(formatSupplierName('wuya')).toBe('Вуя');
  });

  it('does not keep the misspelled Russian label in the supplier map', () => {
    expect(supplierDisplayNames.wuya).toBe('Вуя');
    expect(Object.values(supplierDisplayNames).join(' ')).not.toContain('Буя');
    expect(JSON.stringify(supplierDisplayNames)).not.toMatch(/Буя|буя|Buya|BUYA/);
  });

  it('keeps canonical display names for the other suppliers', () => {
    expect(formatSupplierName('tianran', 'Tianran')).toBe('Тианран');
    expect(formatSupplierName('polybet', 'Polybet')).toBe('Полибет');
  });

  it('does not rename the backend supplier code', () => {
    expect(Object.keys(supplierDisplayNames)).toContain('wuya');
    expect(Object.keys(supplierDisplayNames)).not.toContain('vuya');
  });
});
