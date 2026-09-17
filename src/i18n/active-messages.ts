import { ru } from './ru';
import { DEFAULT_LOCALE, type Locale } from './config';
import type { Messages } from './types';

let activeMessages: Messages = ru;
let activeLocale: Locale = DEFAULT_LOCALE;

export function setActiveMessages(messages: Messages): void {
  activeMessages = messages;
}

export function getActiveMessages(): Messages {
  return activeMessages;
}

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getActiveLocale(): Locale {
  return activeLocale;
}

export function resetActiveMessages(): void {
  activeMessages = ru;
  activeLocale = DEFAULT_LOCALE;
}
