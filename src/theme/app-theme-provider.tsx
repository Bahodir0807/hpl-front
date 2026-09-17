'use client';

import { ThemeProvider } from 'next-themes';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { DEFAULT_THEME, THEME_STORAGE_KEY, type ThemeName } from '@/i18n/config';
import { persistTheme } from '@/i18n/preferences';
import type { ReactNode } from 'react';

function ThemeCookieSync() {
  const { resolvedTheme, theme } = useTheme();

  useEffect(() => {
    const next: ThemeName =
      theme === 'dark' || resolvedTheme === 'dark' ? 'dark' : 'light';
    persistTheme(next);
  }, [resolvedTheme, theme]);

  return null;
}

export function AppThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
}: {
  children: ReactNode;
  initialTheme?: ThemeName;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={initialTheme}
      enableSystem={false}
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      <ThemeCookieSync />
      {children}
    </ThemeProvider>
  );
}
