import { cn } from '@/lib/utils';

export const preferenceGroupClassName =
  'inline-flex overflow-hidden rounded-md border border-border bg-muted p-0.5';

export function preferenceButtonClassName(active: boolean): string {
  return cn(
    'rounded px-2 py-1 font-medium leading-none transition-colors',
    active
      ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
      : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
  );
}
