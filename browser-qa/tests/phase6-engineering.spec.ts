import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { request as pwRequest, test, expect } from '@playwright/test';
import { authDir, screenshotRoot } from '../helpers/env';
import { backendApi } from '../helpers/backend';
import {
  createLead,
  fetchFirstClientId,
  fetchFirstProjectObjectId,
} from '../helpers/lead-factory';

let mixedLeadId = '';

test.beforeAll(async () => {
  mkdirSync(screenshotRoot, { recursive: true });
  const manager = await pwRequest.newContext({
    storageState: path.join(authDir, 'manager.json'),
  });
  const engineer = await pwRequest.newContext({
    storageState: path.join(authDir, 'engineer.json'),
  });

  mixedLeadId = await createLead(manager, 'facade-mixed');
  const clientId = await fetchFirstClientId(manager);
  const projectObjectId = await fetchFirstProjectObjectId(manager, clientId);
  const panelTypes = await manager.get(`${backendApi}/panel-types`);
  const panelSizes = await manager.get(`${backendApi}/panel-sizes`);
  const panelTypeId = (
    (await panelTypes.json()) as Array<{ id: string; code: string }>
  ).find((row) => row.code === 'exterior_with_uv')?.id;
  const panelSizeId = (
    (await panelSizes.json()) as Array<{ id: string; widthMm: number; heightMm: number }>
  ).find((row) => row.widthMm === 1220 && row.heightMm === 2440)?.id;

  const qualify = await manager.post(`${backendApi}/leads/${mixedLeadId}/qualify`, {
    data: {
      clientId,
      projectObjectId,
      needDescription: 'Facade mixed QA',
      decisionMakerContact: 'QA',
      qualification: {
        installationRequired: false,
        customerRequirements: 'Facade mixed',
        ventFacadeKitRequired: true,
        items: [
          {
            application: 'EXTERIOR_WITH_UV',
            panelTypeId,
            panelSizeId,
            thicknessMm: 6,
            requiredAreaM2: 30,
            colorCode: 'W100',
            colorName: 'A',
          },
          {
            application: 'EXTERIOR_WITH_UV',
            panelTypeId,
            panelSizeId,
            thicknessMm: 8,
            requiredAreaM2: 20,
            colorCode: 'W101',
            colorName: 'B',
          },
        ],
      },
    },
  });
  if (!qualify.ok()) {
    throw new Error(`qualify failed: ${qualify.status()} ${await qualify.text()}`);
  }

  const me = await engineer.get(`${backendApi}/auth/me`);
  const engineerId = ((await me.json()) as { id: string }).id;
  await manager.post(`${backendApi}/engineering/leads/${mixedLeadId}/assign`, {
    data: { engineerId },
  });
  await manager.dispose();
  await engineer.dispose();
});

test('ENGINEER: mixed thickness requires confirmation then calculates', async ({
  page,
  request,
}) => {
  const leadId = mixedLeadId;

  const workspaceBefore = await request.get(
    `${backendApi}/engineering/leads/${leadId}/facade`,
  );
  expect(workspaceBefore.ok()).toBeTruthy();
  const wsBefore = (await workspaceBefore.json()) as {
    thicknessConflict: boolean;
    hplThicknessesMm: number[];
  };
  expect(wsBefore.thicknessConflict).toBe(true);
  expect(wsBefore.hplThicknessesMm).toEqual([6, 8]);

  const blocked = await request.post(
    `${backendApi}/engineering/leads/${leadId}/facade/calculate`,
    {
      data: {
        configCode: 'HPL_DRY_6MM_50MM',
        claddingAreaM2: '50',
      },
    },
  );
  expect(blocked.status()).toBe(409);

  const allowed = await request.post(
    `${backendApi}/engineering/leads/${leadId}/facade/calculate`,
    {
      data: {
        configCode: 'HPL_DRY_6MM_50MM',
        claddingAreaM2: '50',
        confirmThicknessMismatch: true,
      },
    },
  );
  expect(allowed.ok()).toBeTruthy();

  await page.goto(`/engineering/leads/${leadId}`);
  await expect(page.locator('main')).toBeVisible();

  await page.goto('/engineering');
  await expect(page.locator('main')).toBeVisible();
  await page.screenshot({
    path: path.join(screenshotRoot, 'engineer-facade-mixed.png'),
    fullPage: true,
  });

  const workspace = await request.get(
    `${backendApi}/engineering/leads/${leadId}/facade`,
  );
  const ws = (await workspace.json()) as { thicknessConflict: boolean };
  expect(ws.thicknessConflict).toBe(true);
});
