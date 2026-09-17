import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, parseLocale } from './config';
import { dictionaries } from './dictionaries';
import { createTranslator } from './translate';

describe('default locale behavior', () => {
  it('defaults empty preference to RU', () => {
    expect(DEFAULT_LOCALE).toBe('ru');
    expect(parseLocale(undefined)).toBe('ru');
    expect(parseLocale(null)).toBe('ru');
    expect(parseLocale('')).toBe('ru');
  });

  it('does not use browser language when preference is empty', () => {
    const original = window.navigator.language;
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });

    expect(parseLocale(undefined)).toBe('ru');
    expect(createTranslator(dictionaries.ru)('navigation.leads')).toBe('Лиды');

    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: original,
    });
  });

  it('accepts only explicit ru, uz, or en', () => {
    expect(parseLocale('uz')).toBe('uz');
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('en-US')).toBe('ru');
    expect(parseLocale('uz-UZ')).toBe('ru');
  });
});
