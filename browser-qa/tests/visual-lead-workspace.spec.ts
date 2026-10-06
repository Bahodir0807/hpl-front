import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { request as pwRequest, test } from '@playwright/test';
import { authDir, screenshotRoot } from '../helpers/env';
import { createLead } from '../helpers/lead-factory';

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

let leadId = '';

test.beforeAll(async () => {
  mkdirSync(screenshotRoot, { recursive: true });
  const manager = await pwRequest.newContext({
    storageState: path.join(authDir, 'manager.json'),
  });
  leadId = await createLead(manager, 'visual-workspace');
  await manager.dispose();
});

for (const combo of combos) {
  test(`lead workspace ${combo.locale} ${combo.theme}`, async ({ page }, testInfo) => {
    const viewport = testInfo.project.name.includes('mobile') ? 'mobile' : 'desktop';
    if (viewport === 'mobile') {
      await page.setViewportSize({ width: 390, height: 844 });
    }

    await page.goto(`/leads/${leadId}`);
    await page
      .getByRole('button', { name: combo.locale.toUpperCase(), exact: true })
      .click();
    await page
      .getByRole('button', {
        name: combo.theme === 'light' ? /light|светл|yorug/i : /dark|тёмн|qorong/i,
      })
      .click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(
        screenshotRoot,
        `lead-workspace-${combo.locale}-${combo.theme}-${viewport}.png`,
      ),
      fullPage: true,
    });
  });
}
