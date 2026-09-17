import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_INIT_SCRIPT } from '@/theme/theme-script';
import { DEFAULT_THEME, parseTheme } from '@/i18n/config';

const css = readFileSync(
  resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

describe('theme tokens', () => {
  it('defaults to light and treats unknown values as light', () => {
    expect(DEFAULT_THEME).toBe('light');
    expect(parseTheme(undefined)).toBe('light');
    expect(parseTheme('system')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
  });

  it('defines semantic tokens for both light and dark', () => {
    for (const token of [
      '--background',
      '--foreground',
      '--card',
      '--popover',
      '--primary',
      '--secondary',
      '--muted',
      '--accent',
      '--border',
      '--input',
      '--ring',
      '--destructive',
      '--success',
      '--warning',
    ]) {
      expect(css).toContain(token);
    }

    expect(css).toContain('.dark');
    expect(css).toContain('@custom-variant dark');
    expect(css).toContain('html.dark .bg-white');
    expect(css).toContain('html.dark .text-slate-950');
    expect(css).toContain('html.dark .text-slate-900');
    expect(css).toContain('html.dark .text-black');
  });

  it('applies stored theme before paint without using system theme', () => {
    expect(THEME_INIT_SCRIPT).toContain("'light'");
    expect(THEME_INIT_SCRIPT).toContain('hpl-theme');
    expect(THEME_INIT_SCRIPT).not.toContain('prefers-color-scheme');
  });
});
