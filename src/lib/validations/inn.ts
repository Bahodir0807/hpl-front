import { z } from 'zod';

const INN_ERROR = 'ИНН должен содержать 9 или 12 цифр';

export function isValidInn(value: string): boolean {
  const digits = value.replace(/\s/g, '');

  return /^\d{9}$/.test(digits) || /^\d{12}$/.test(digits);
}

export const innSchema = z.string().refine(isValidInn, {
  message: INN_ERROR,
});

export const optionalInnSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || isValidInn(value), {
    message: INN_ERROR,
  });
