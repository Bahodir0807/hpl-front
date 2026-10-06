import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { screenshotRoot } from '../helpers/env';
import { LEAD_PREFIX } from '../helpers/qa-data';
import { backendApi, getExteriorQualificationRefs } from '../helpers/backend';
import {
  createLead,
  fetchFirstClientId,
  fetchFirstProjectObjectId,
} from '../helpers/lead-factory';

test.beforeAll(() => {
  mkdirSync(screenshotRoot, { recursive: true });
});

test('MANAGER: creates a lead from UI', async ({ page }) => {
  const title = `${LEAD_PREFIX}ui-${Date.now()}`;
  await page.goto('/leads');
  const createLead = page.getByRole('button', {
    name: /создать лид|create lead/i,
  });
  await createLead.scrollIntoViewIfNeeded();
  await createLead.click();
  await page.getByLabel(/название|title/i).fill(title);
  await page.getByLabel(/^источник$|^source$/i).fill('browser-qa');
  await page
    .locator('form')
    .getByRole('button', { name: /создать лид|create lead/i })
    .click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 30_000 });
  await page.screenshot({
    path: path.join(screenshotRoot, 'manager-lead-created.png'),
    fullPage: true,
  });
});

test('MANAGER: lead workspace shows qualification and calculation entry', async ({
  page,
  request,
}) => {
  const leadId = await createLead(request, 'workspace');
  const clientId = await fetchFirstClientId(request);

  const { panelTypeId, panelSizeId } = await getExteriorQualificationRefs(request);
  const projectObjectId = await fetchFirstProjectObjectId(request, clientId);

  const qualify = await request.post(`${backendApi}/leads/${leadId}/qualify`, {
    data: {
      clientId,
      projectObjectId,
      needDescription: 'Browser QA qualification',
      decisionMakerContact: 'QA Architect',
      qualification: {
        installationRequired: false,
        customerRequirements: 'Browser QA',
        ventFacadeKitRequired: false,
        application: 'EXTERIOR_WITH_UV',
        panelTypeId,
        panelSizeId,
        thicknessMm: 8,
        requiredAreaM2: 25,
        colorCode: 'W100',
        colorName: 'White',
      },
    },
  });
  if (!qualify.ok()) {
    throw new Error(`qualify failed: ${qualify.status()} ${await qualify.text()}`);
  }

  await page.goto(`/leads/${leadId}`);
  await expect(page.locator('main')).toBeVisible();
  await expect(
    page.getByText(/qa architect|квалифицирован|qualified/i).first(),
  ).toBeVisible();

  const note = await request.patch(
    `${backendApi}/leads/${leadId}/manager-commercial-note`,
    { data: { commercialNote: 'Browser QA manager note' } },
  );
  expect(note.ok()).toBeTruthy();

  await page.reload();
  const leadCheck = await request.get(`${backendApi}/leads/${leadId}`);
  expect(leadCheck.ok()).toBeTruthy();
  const leadBody = (await leadCheck.json()) as {
    managerCommercialNote?: string | null;
  };
  expect(leadBody.managerCommercialNote).toBe('Browser QA manager note');

  await page.screenshot({
    path: path.join(screenshotRoot, 'manager-lead-workspace.png'),
    fullPage: true,
  });
});
