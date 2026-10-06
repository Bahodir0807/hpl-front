import { chromium, type Browser, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { apiURL, authDir, baseURL, LOGIN_SPACING_MS } from './helpers/env';
import { PASSWORD, ROLE_EMAILS, type RoleKey } from './helpers/qa-data';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function storageStateValid(
  browser: Browser,
  statePath: string,
): Promise<boolean> {
  if (!fs.existsSync(statePath)) {
    return false;
  }
  const context = await browser.newContext({
    baseURL,
    storageState: statePath,
  });
  const me = await context.request.get(`${baseURL}/api/backend/auth/me`);
  await context.close();
  return me.ok();
}

async function globalSetup(_config: FullConfig): Promise<void> {
  fs.mkdirSync(authDir, { recursive: true });

  const health = await fetch(`${apiURL}/health`);
  if (!health.ok) {
    throw new Error(
      `Backend QA is not healthy at ${apiURL}/health (HTTP ${health.status}). Start hpl-back on :3006 with crm_browser_qa.`,
    );
  }

  const roles = Object.entries(ROLE_EMAILS) as Array<[RoleKey, string]>;
  const reuseAuth = process.env.BROWSER_QA_REUSE_AUTH === '1';

  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
  });

  let loginsThisRun = 0;

  for (let index = 0; index < roles.length; index += 1) {
    const [role, email] = roles[index];
    const statePath = path.join(authDir, `${role}.json`);

    if (reuseAuth && (await storageStateValid(browser, statePath))) {
      continue;
    }

    if (loginsThisRun > 0) {
      await sleep(LOGIN_SPACING_MS);
    }

    const context = await browser.newContext({ baseURL });
    const response = await context.request.post(`${baseURL}/api/auth/login`, {
      data: { email, password: PASSWORD },
    });

    if (!response.ok()) {
      await context.close();
      await browser.close();
      throw new Error(
        `Auth setup failed for ${role}: HTTP ${response.status()} (login limit is 5/min; wait 60s or use valid .auth/*.json)`,
      );
    }

    await context.storageState({ path: statePath });
    await context.close();
    loginsThisRun += 1;
  }

  await browser.close();
}

export default globalSetup;
