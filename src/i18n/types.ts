import type { ru } from './ru';

type DeepStringify<T> = T extends string
  ? string
  : T extends readonly unknown[]
    ? { [K in keyof T]: DeepStringify<T[K]> }
    : T extends object
      ? { [K in keyof T]: DeepStringify<T[K]> }
      : T;

export type Messages = DeepStringify<typeof ru>;
