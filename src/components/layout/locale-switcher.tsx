'use client';

import { LOCALES, LOCALE_LABELS } from '@/i18n/config';
import { useI18n } from '@/i18n/provider';
import {
  preferenceButtonClassName,
  preferenceGroupClassName,
} from './preference-control';

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t('locale.change')}
      title={t('locale.change')}
      className={`${preferenceGroupClassName} text-[11px]`}
    >
      {LOCALES.map((item) => {
        const active = locale === item;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={active}
            data-active={active ? 'true' : 'false'}
            aria-label={LOCALE_LABELS[item]}
            onClick={() => setLocale(item)}
            className={`${preferenceButtonClassName(active)} px-1.5 py-1.5 tracking-wide`}
          >
            {LOCALE_LABELS[item]}
          </button>
        );
      })}
    </div>
  );
}
