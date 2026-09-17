import { z } from 'zod';
import { ru } from '@/i18n/ru';
import { getActiveMessages } from '@/i18n/active-messages';
import type { Messages } from '@/i18n/types';

export const PHONE_ERROR = ru.validation.phone;

export function isValidPhone(value: string): boolean {
  const stripped = value.replace(/[\s\-()]/g, '');

  if (!/^[+\d]/.test(stripped)) {
    return false;
  }

  if (stripped.startsWith('+')) {
    if (!/^\+\d+$/.test(stripped)) {
      return false;
    }
  } else if (!/^\d+$/.test(stripped)) {
    return false;
  }

  const digitCount = stripped.replace(/\D/g, '').length;

  return digitCount >= 7 && digitCount <= 15;
}

export function createPhoneSchema(messages: Messages = getActiveMessages()) {
  return z.string().refine(isValidPhone, {
    message: messages.validation.phone,
  });
}

export function createOptionalPhoneSchema(messages: Messages = getActiveMessages()) {
  return z
    .string()
    .trim()
    .refine((value) => value.length === 0 || isValidPhone(value), {
      message: messages.validation.phone,
    });
}

export const phoneSchema = createPhoneSchema();

export const optionalPhoneSchema = createOptionalPhoneSchema();
