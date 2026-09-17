'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { useI18n } from '@/i18n/provider';
import {
  preferenceButtonClassName,
  preferenceGroupClassName,
} from './preference-control';

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <div
      role="group"
      aria-label={t('theme.label')}
      className={preferenceGroupClassName}
    >
      <button
        type="button"
        aria-pressed={!isDark}
        data-active={!isDark ? 'true' : 'false'}
        aria-label={t('theme.light')}
        title={t('theme.light')}
        onClick={() => setTheme('light')}
        className={preferenceButtonClassName(!isDark)}
      >
        <span aria-hidden="true">☀</span>
      </button>
      <button
        type="button"
        aria-pressed={isDark}
        data-active={isDark ? 'true' : 'false'}
        aria-label={t('theme.dark')}
        title={t('theme.dark')}
        onClick={() => setTheme('dark')}
        className={preferenceButtonClassName(isDark)}
      >
        <span aria-hidden="true">☾</span>
      </button>
    </div>
  );
}
