import { z } from 'zod';

const PHONE_ERROR = 'Введите корректный номер телефона';

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

export const phoneSchema = z.string().refine(isValidPhone, {
  message: PHONE_ERROR,
});

export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || isValidPhone(value), {
    message: PHONE_ERROR,
  });
