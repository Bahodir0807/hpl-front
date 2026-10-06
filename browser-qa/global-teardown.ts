import { request as playwrightRequest } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { apiURL, authDir } from './helpers/env';
import { cleanupBrowserQaLeads } from './helpers/cleanup';

async function globalTeardown(): Promise<void> {
  const managerState = path.join(authDir, 'manager.json');
  if (!fs.existsSync(managerState)) {
    return;
  }
  const context = await playwrightRequest.newContext({
    storageState: managerState,
  });
  try {
    await cleanupBrowserQaLeads(context, apiURL);
  } catch {
    // Backend QA may already be stopped; cleanup is best-effort.
  }
  await context.dispose();
}

export default globalTeardown;
