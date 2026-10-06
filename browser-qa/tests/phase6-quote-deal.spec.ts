import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { request as pwRequest, test, expect } from '@playwright/test';
import { authDir, screenshotRoot } from '../helpers/env';
import { backendApi } from '../helpers/backend';
import { seedApprovedFinalizedQuote } from '../helpers/workflow-seed';
import { leadTabQuotes } from '../helpers/workspace-tabs';

let seed = { leadId: '', quoteId: '', requestId: '' };

test.beforeAll(async () => {
  mkdirSync(screenshotRoot, { recursive: true });
  const manager = await pwRequest.newContext({
    storageState: path.join(authDir, 'manager.json'),
  });
  const head = await pwRequest.newContext({
    storageState: path.join(authDir, 'head.json'),
  });
  seed = await seedApprovedFinalizedQuote(manager, head, String(Date.now()));
  await manager.dispose();
  await head.dispose();
});

test('QUOTE: UI shows finalized quote and downloads stable customer PDF', async ({
  page,
}) => {
  await page.goto(`/leads/${seed.leadId}`);
  await page.getByRole('button', { name: leadTabQuotes }).click();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByText(/browser qa|кп|quote/i).first()).toBeVisible({
    timeout: 30_000,
  });

  const first = await page.request.get(`${backendApi}/quotes/${seed.quoteId}/pdf`);
  expect(first.ok()).toBeTruthy();
  const body1 = await first.body();
  expect(body1.byteLength).toBeGreaterThan(500);
  const text1 = body1.toString('latin1');
  expect(text1).not.toMatch(/INTERNAL-ONLY-DO-NOT-SHOW/);
  expect(text1).not.toMatch(/purchasePricePerM2/i);
  expect(text1).not.toContain(seed.quoteId);

  const second = await page.request.get(`${backendApi}/quotes/${seed.quoteId}/pdf`);
  expect(second.ok()).toBeTruthy();
  const body2 = await second.body();
  expect(body2.byteLength).toBe(body1.byteLength);

  await page.screenshot({
    path: path.join(screenshotRoot, 'quote-lead-tab.png'),
    fullPage: true,
  });
});

test('DEAL: HEAD converts approved quote to deal in UI', async ({ page, request }) => {
  const fresh = await pwRequest.newContext({
    storageState: path.join(authDir, 'head.json'),
  });
  const manager = await pwRequest.newContext({
    storageState: path.join(authDir, 'manager.json'),
  });
  const isolated = await seedApprovedFinalizedQuote(
    manager,
    fresh,
    `deal-${Date.now()}`,
  );
  await fresh.dispose();
  await manager.dispose();

  const convertRes = await page.request.post(
    `${backendApi}/quotes/${isolated.quoteId}/convert-to-deal`,
    { data: {} },
  );
  expect(convertRes.ok()).toBeTruthy();
  const dealId = ((await convertRes.json()) as { dealId: string }).dealId;

  await page.goto(`/leads/${isolated.leadId}`);
  await page.getByRole('button', { name: leadTabQuotes }).click();
  await expect(
    page.getByRole('link', { name: new RegExp(dealId.slice(0, 8), 'i') }),
  ).toBeVisible({ timeout: 30_000 });
  await page.goto(`/deals?dealId=${dealId}`);
  await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });

  const lead = await request.get(`${backendApi}/leads/${isolated.leadId}`);
  expect(lead.ok()).toBeTruthy();
  const leadBody = (await lead.json()) as { dealId?: string | null; status?: string };
  expect(leadBody.dealId).toBeTruthy();

  await page.screenshot({
    path: path.join(screenshotRoot, 'deal-from-quote.png'),
    fullPage: true,
  });
});

test('DEAL: MANAGER cannot convert quote via API', async () => {
  const manager = await pwRequest.newContext({
    storageState: path.join(authDir, 'manager.json'),
  });
  const response = await manager.post(
    `${backendApi}/quotes/${seed.quoteId}/convert-to-deal`,
    { data: {} },
  );
  expect(response.status()).toBe(403);
  await manager.dispose();
});
