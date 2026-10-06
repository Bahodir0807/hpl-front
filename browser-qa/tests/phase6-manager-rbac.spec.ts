import { test, expect } from '@playwright/test';

test('MANAGER: cannot open users admin page', async ({ page }) => {
  await page.goto('/users');
  await expect(page).not.toHaveURL(/\/users$/);
});
