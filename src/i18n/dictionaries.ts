import { ru } from './ru';
import { uz } from './uz';
import { en } from './en';
import type { Locale } from './config';
import type { Messages } from './types';

export const dictionaries: Record<Locale, Messages> = {
  ru,
  uz,
  en,
};
