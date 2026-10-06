import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { apiURL, screenshotRoot } from '../helpers/env';
import { PASSWORD, PROBE_EMAIL } from '../helpers/qa-data';

test.beforeAll(async () => {
  mkdirSync(screenshotRoot, { recursive: true });
  // Runs last in the suite after global-setup role logins (5/min limit).
  await new Promise((resolve) => setTimeout(resolve, 65_000));
});

test('probe user authenticates only via QA stack', async ({ page, request }) => {
  const health = await request.get(`${apiURL}/health`);
  expect(health.ok()).toBeTruthy();

  await page.goto('/login');
  await page.getByLabel('Email').fill(PROBE_EMAIL);
  await page.getByLabel(/password|пароль|parol/i).fill(PASSWORD);
  await page.getByRole('button', { name: /войти|log in|kirish/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 45_000,
  });

  await page.screenshot({
    path: path.join(screenshotRoot, 'isolation-probe-login.png'),
    fullPage: true,
  });
});
