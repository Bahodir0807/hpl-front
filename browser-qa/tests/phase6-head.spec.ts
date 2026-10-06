import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { request as pwRequest, test, expect } from '@playwright/test';
import { authDir, screenshotRoot } from '../helpers/env';
import {
  backendApi,
  getDefaultCalculationItemRefs,
  getExteriorQualificationRefs,
} from '../helpers/backend';
import {
  createLead,
  fetchFirstClientId,
  fetchFirstProjectObjectId,
} from '../helpers/lead-factory';
import { leadTabCalculations } from '../helpers/workspace-tabs';

let submittedLeadId = '';

test.beforeAll(async () => {
  mkdirSync(screenshotRoot, { recursive: true });
  const manager = await pwRequest.newContext({
    storageState: path.join(authDir, 'manager.json'),
  });

  const leadId = await createLead(manager, 'head-flow');
  const clientId = await fetchFirstClientId(manager);
  const projectObjectId = await fetchFirstProjectObjectId(manager, clientId);
  const { panelTypeId, panelSizeId } = await getExteriorQualificationRefs(manager);
  const { supplierId, qualityClassId } =
    await getDefaultCalculationItemRefs(manager);

  await manager.post(`${backendApi}/leads/${leadId}/qualify`, {
    data: {
      clientId,
      projectObjectId,
      needDescription: 'HEAD browser QA',
      decisionMakerContact: 'QA',
      qualification: {
        installationRequired: false,
        customerRequirements: 'HEAD browser QA',
        application: 'EXTERIOR_WITH_UV',
        panelTypeId,
        panelSizeId,
        thicknessMm: 8,
        requiredAreaM2: 40,
        colorCode: 'W100',
        colorName: 'White',
      },
    },
  });

  const calc = await manager.post(`${backendApi}/calculations/requests`, {
    data: {
      leadId,
      notes: 'Browser QA calculation request',
      calculations: [
        {
          title: 'HPL panels',
          items: [
            {
              panelTypeId,
              panelSizeId,
              thicknessMm: 8,
              qualityClassId,
              requiredAreaM2: '40',
              supplierId,
            },
          ],
        },
      ],
    },
  });
  if (!calc.ok()) {
    throw new Error(`calculation request create failed: ${calc.status()} ${await calc.text()}`);
  }
  const calcBody = (await calc.json()) as { id: string };

  const submit = await manager.post(
    `${backendApi}/calculations/requests/${calcBody.id}/submit`,
  );
  expect(submit.ok()).toBeTruthy();
  submittedLeadId = leadId;
  await manager.dispose();
});

test('HEAD: sees submitted calculation request on lead workspace', async ({
  page,
}) => {
  await page.goto(`/leads/${submittedLeadId}`);
  await expect(page.locator('main')).toBeVisible();
  await page.getByRole('button', { name: leadTabCalculations }).click();
  await expect(
    page.getByText(/отправлен руководителю|sent to head/i).first(),
  ).toBeVisible({ timeout: 30_000 });
  await page.screenshot({
    path: path.join(screenshotRoot, 'head-lead-submitted-request.png'),
    fullPage: true,
  });
});
