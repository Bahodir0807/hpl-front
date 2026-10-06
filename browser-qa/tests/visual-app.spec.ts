import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { screenshotRoot } from '../helpers/env';

type Locale = 'ru' | 'uz' | 'en';
type Theme = 'light' | 'dark';

const combos: Array<{ locale: Locale; theme: Theme }> = [
  { locale: 'ru', theme: 'light' },
  { locale: 'ru', theme: 'dark' },
  { locale: 'uz', theme: 'light' },
  { locale: 'uz', theme: 'dark' },
  { locale: 'en', theme: 'light' },
  { locale: 'en', theme: 'dark' },
];

const routes = [
  { name: 'dashboard', path: '/' },
  { name: 'leads', path: '/leads' },
];

async function setLocale(page: import('@playwright/test').Page, locale: Locale) {
  await page.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
  await page.waitForTimeout(250);
}

async function setTheme(page: import('@playwright/test').Page, theme: Theme) {
  const label =
    theme === 'light' ? /light|светл|yorug/i : /dark|тёмн|qorong/i;
  await page.getByRole('button', { name: label }).click();
  await page.waitForTimeout(250);
}

test.beforeAll(() => {
  mkdirSync(screenshotRoot, { recursive: true });
});

for (const combo of combos) {
  test(`app visual ${combo.locale} ${combo.theme}`, async ({ page }, testInfo) => {
    const viewport = testInfo.project.name.includes('mobile') ? 'mobile' : 'desktop';
    if (viewport === 'mobile') {
      await page.setViewportSize({ width: 390, height: 844 });
    }

    await page.goto('/');
    await setLocale(page, combo.locale);
    await setTheme(page, combo.theme);

    for (const route of routes) {
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');
      await page.screenshot({
        path: path.join(
          screenshotRoot,
          `app-${route.name}-${combo.locale}-${combo.theme}-${viewport}.png`,
        ),
        fullPage: true,
      });
    }
  });
}
