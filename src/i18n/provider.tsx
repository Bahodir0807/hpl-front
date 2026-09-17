'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  type Locale,
} from './config';
import { dictionaries } from './dictionaries';
import { persistLocale } from './preferences';
import { setActiveLocale, setActiveMessages } from './active-messages';
import { createTranslator, type TranslateFn } from './translate';
import type { Messages } from './types';

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: TranslateFn;
  setLocale: (locale: Locale) => void;
};

const defaultMessages = dictionaries[DEFAULT_LOCALE];

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  messages: defaultMessages,
  t: createTranslator(defaultMessages),
  setLocale: () => {},
});

export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const messages = dictionaries[locale];
  setActiveMessages(messages);
  setActiveLocale(locale);
  const t = useMemo(() => createTranslator(messages), [messages]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next;
    }
  }, []);

  const value = useMemo(
    () => ({ locale, messages, t, setLocale }),
    [locale, messages, t, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
