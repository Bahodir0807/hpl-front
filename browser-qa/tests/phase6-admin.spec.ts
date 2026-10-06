import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { screenshotRoot } from '../helpers/env';

test.beforeAll(() => {
  mkdirSync(screenshotRoot, { recursive: true });
});

test('ADMIN: users page loads', async ({ page }) => {
  await page.goto('/users');
  await expect(page.locator('main')).toBeVisible();
  await page.screenshot({
    path: path.join(screenshotRoot, 'admin-users.png'),
    fullPage: true,
  });
});
