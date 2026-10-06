import { test, expect } from '@playwright/test';

test('DIRECTOR: deals board loads', async ({ page }) => {
  await page.goto('/deals');
  await expect(page.locator('main')).toBeVisible();
});
