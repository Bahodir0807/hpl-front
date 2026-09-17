import Cookies from 'js-cookie';
import {
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  PREFERENCE_MAX_AGE,
  THEME_COOKIE,
  THEME_STORAGE_KEY,
  isLocale,
  parseTheme,
  type Locale,
  type ThemeName,
} from './config';

const cookieOptions: Cookies.CookieAttributes = {
  path: '/',
  sameSite: 'lax',
  expires: PREFERENCE_MAX_AGE / (60 * 60 * 24),
};

export function persistLocale(locale: Locale): void {
  if (typeof document === 'undefined') {
    return;
  }

  Cookies.set(LOCALE_COOKIE, locale, cookieOptions);
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function persistTheme(theme: ThemeName): void {
  if (typeof document === 'undefined') {
    return;
  }

  Cookies.set(THEME_COOKIE, theme, cookieOptions);
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const fromCookie = Cookies.get(LOCALE_COOKIE);
  if (isLocale(fromCookie)) {
    return fromCookie;
  }

  const fromStorage = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(fromStorage) ? fromStorage : null;
}

export function readStoredTheme(): ThemeName | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const fromCookie = Cookies.get(THEME_COOKIE);
  if (fromCookie) {
    return parseTheme(fromCookie);
  }

  const fromStorage = window.localStorage.getItem(THEME_STORAGE_KEY);
  return fromStorage ? parseTheme(fromStorage) : null;
}

export function applyThemeClass(theme: ThemeName): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}
