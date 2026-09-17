import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/i18n/provider';
import { AppThemeProvider } from '@/theme/app-theme-provider';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';
import { persistLocale, persistTheme } from '@/i18n/preferences';
import Cookies from 'js-cookie';
import { LOCALE_COOKIE, THEME_COOKIE, parseLocale, parseTheme } from '@/i18n/config';

function renderControls(locale: 'ru' | 'uz' | 'en' = 'ru') {
  return render(
    <AppThemeProvider initialTheme="light">
      <I18nProvider initialLocale={locale}>
        <LocaleSwitcher />
        <ThemeToggle />
      </I18nProvider>
    </AppThemeProvider>,
  );
}

describe('header theme and language controls', () => {
  it('defaults to RU and Light', () => {
    renderControls();
    expect(screen.getByRole('button', { name: 'RU' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Светлая тема' })).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Тёмная тема' })).toHaveAttribute(
      'data-active',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Светлая тема' }).className).toContain(
      'bg-background',
    );
  });

  it('switches language without a page reload and persists the choice', async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByRole('button', { name: 'UZ' }));
    expect(screen.getByRole('button', { name: 'UZ' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(Cookies.get(LOCALE_COOKIE)).toBe('uz');
    expect(window.localStorage.getItem('hpl-locale')).toBe('uz');

    persistLocale('en');
    expect(Cookies.get(LOCALE_COOKIE)).toBe('en');
  });

  it('switches theme without reload and persists Dark', async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByRole('button', { name: 'Тёмная тема' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(screen.getByRole('button', { name: 'Тёмная тема' })).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Светлая тема' })).toHaveAttribute(
      'data-active',
      'false',
    );
    expect(Cookies.get(THEME_COOKIE)).toBe('dark');
    persistTheme('light');
    expect(Cookies.get(THEME_COOKIE)).toBe('light');
  });

  it('preserves UZ after a simulated reload', async () => {
    const user = userEvent.setup();
    renderControls();
    await user.click(screen.getByRole('button', { name: 'UZ' }));
    expect(parseLocale(Cookies.get(LOCALE_COOKIE))).toBe('uz');
    expect(parseLocale(window.localStorage.getItem('hpl-locale'))).toBe('uz');
  });

  it('preserves EN after a simulated reload', async () => {
    const user = userEvent.setup();
    renderControls();
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(parseLocale(Cookies.get(LOCALE_COOKIE))).toBe('en');
  });

  it('returns to Light after Dark and keeps the choice', async () => {
    const user = userEvent.setup();
    renderControls();
    await user.click(screen.getByRole('button', { name: 'Тёмная тема' }));
    expect(parseTheme(Cookies.get(THEME_COOKIE))).toBe('dark');
    await user.click(screen.getByRole('button', { name: 'Светлая тема' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(parseTheme(Cookies.get(THEME_COOKIE))).toBe('light');
  });
});
