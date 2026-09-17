export const LOCALES = ['ru', 'uz', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ru';

export const LOCALE_COOKIE = 'hpl-locale';
export const THEME_COOKIE = 'hpl-theme';
export const LOCALE_STORAGE_KEY = 'hpl-locale';
export const THEME_STORAGE_KEY = 'hpl-theme';

export const PREFERENCE_MAX_AGE = 60 * 60 * 24 * 365;

export const INTL_LOCALES: Record<Locale, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  en: 'en-US',
};

export const LOCALE_LABELS: Record<Locale, string> = {
  ru: 'RU',
  uz: 'UZ',
  en: 'EN',
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'ru' || value === 'uz' || value === 'en';
}

export function parseLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export type ThemeName = 'light' | 'dark';

export const DEFAULT_THEME: ThemeName = 'light';

export function parseTheme(value: string | null | undefined): ThemeName {
  return value === 'dark' ? 'dark' : DEFAULT_THEME;
}
