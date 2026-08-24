import { describe, expect, it } from 'vitest';
import { dateInputToIso, toDateInputValue } from './format';

describe('date input ISO contract', () => {
  it('converts YYYY-MM-DD to an ISO DateTime at local midnight', () => {
    expect(dateInputToIso('2026-09-15')).toBe(
      new Date(2026, 8, 15).toISOString(),
    );
    expect(dateInputToIso('')).toBeUndefined();
  });

  it('round-trips a stored ISO DateTime into a date input value', () => {
    const iso = new Date(2026, 8, 15).toISOString();
    expect(toDateInputValue(iso)).toBe('2026-09-15');
  });
});
