import type { Messages } from './types';

export type TranslateParams = Record<string, string | number>;
export type TranslateFn = (key: string, params?: TranslateParams) => string;

export function getByPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object' && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, source);
}

export function interpolate(
  template: string,
  params?: TranslateParams,
): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}

export function createTranslator(messages: Messages): TranslateFn {
  return (key, params) => {
    const value = getByPath(messages, key);
    if (typeof value !== 'string') {
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(`Missing translation: ${key}`);
      }
      return key;
    }

    return interpolate(value, params);
  };
}

export function collectMessageKeys(
  value: unknown,
  prefix = '',
): string[] {
  if (typeof value === 'string') {
    return prefix ? [prefix] : [];
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, nested]) =>
      collectMessageKeys(nested, prefix ? `${prefix}.${key}` : key),
  );
}
