import { test, expect } from '@playwright/test';
import { backendApi } from '../helpers/backend';

test('ENGINEER: cannot create leads via API', async ({ page }) => {
  const response = await page.request.post(`${backendApi}/leads`, {
    data: { title: 'BrowserQA forbidden', source: 'browser-qa' },
  });
  expect(response.status()).toBe(403);
});

