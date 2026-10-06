import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { screenshotRoot } from '../helpers/env';

type Locale = 'ru' | 'uz' | 'en';

async function setLocale(page: import('@playwright/test').Page, locale: Locale) {
  const label = locale.toUpperCase();
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(200);
}

async function setTheme(page: import('@playwright/test').Page, theme: 'light' | 'dark') {
  const label = theme === 'light' ? /light|светл|yorug/i : /dark|тёмн|qorong/i;
  await page.getByRole('button', { name: label }).click();
}

const combos: Array<{ locale: Locale; theme: 'light' | 'dark' }> = [
  { locale: 'ru', theme: 'light' },
  { locale: 'ru', theme: 'dark' },
  { locale: 'uz', theme: 'light' },
  { locale: 'uz', theme: 'dark' },
  { locale: 'en', theme: 'light' },
  { locale: 'en', theme: 'dark' },
];

test.beforeAll(() => {
  mkdirSync(screenshotRoot, { recursive: true });
});

for (const combo of combos) {
  test(`login visual ${combo.locale} ${combo.theme}`, async ({ page }, testInfo) => {
    const viewport = testInfo.project.name.includes('mobile') ? 'mobile' : 'desktop';
    if (viewport === 'mobile') {
      await page.setViewportSize({ width: 390, height: 844 });
    } else {
      await page.setViewportSize({ width: 1280, height: 800 });
    }

    await page.goto('/login');
    await setLocale(page, combo.locale);
    await setTheme(page, combo.theme);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(
        screenshotRoot,
        `login-${combo.locale}-${combo.theme}-${viewport}.png`,
      ),
      fullPage: true,
    });
  });
}
