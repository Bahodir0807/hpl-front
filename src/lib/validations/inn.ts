import { z } from 'zod';
import { ru } from '@/i18n/ru';
import { getActiveMessages } from '@/i18n/active-messages';
import type { Messages } from '@/i18n/types';

export const INN_ERROR = ru.validation.inn;

export function isValidInn(value: string): boolean {
  const digits = value.replace(/\s/g, '');

  return /^\d{9}$/.test(digits) || /^\d{12}$/.test(digits);
}

export function createInnSchema(messages: Messages = getActiveMessages()) {
  return z.string().refine(isValidInn, {
    message: messages.validation.inn,
  });
}

export function createOptionalInnSchema(messages: Messages = getActiveMessages()) {
  return z
    .string()
    .trim()
    .refine((value) => value.length === 0 || isValidInn(value), {
      message: messages.validation.inn,
    });
}

export const innSchema = createInnSchema();

export const optionalInnSchema = createOptionalInnSchema();
