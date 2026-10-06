import type { APIRequestContext } from '@playwright/test';
import { backendApi } from './backend';
import { LEAD_PREFIX } from './qa-data';

export async function createLead(
  request: APIRequestContext,
  suffix: string,
): Promise<string> {
  const title = `${LEAD_PREFIX}${suffix}-${Date.now()}`;
  const response = await request.post(`${backendApi}/leads`, {
    data: { title, source: 'browser-qa' },
  });
  if (!response.ok()) {
    throw new Error(
      `createLead failed: ${response.status()} ${await response.text()}`,
    );
  }
  const body = (await response.json()) as { id: string };
  return body.id;
}

export async function fetchFirstClientId(
  request: APIRequestContext,
): Promise<string> {
  const response = await request.get(`${backendApi}/clients`, {
    params: { page: 1, limit: 1 },
  });
  if (!response.ok()) {
    throw new Error(`clients list failed: ${response.status()}`);
  }
  const payload = (await response.json()) as {
    items?: Array<{ id: string }>;
    data?: Array<{ id: string }>;
  };
  const id = payload.items?.[0]?.id ?? payload.data?.[0]?.id;
  if (!id) {
    throw new Error('No client in QA database');
  }
  return id;
}

/** Reads projectObjects from client detail; creates one if the client has none. */
export async function fetchFirstProjectObjectId(
  request: APIRequestContext,
  clientId: string,
): Promise<string> {
  const detail = await request.get(`${backendApi}/clients/${clientId}`);
  if (!detail.ok()) {
    throw new Error(`client detail failed: ${detail.status()}`);
  }
  const client = (await detail.json()) as {
    projectObjects?: Array<{ id: string }>;
  };
  const existing = client.projectObjects?.[0]?.id;
  if (existing) {
    return existing;
  }

  const created = await request.post(`${backendApi}/clients/${clientId}/objects`, {
    data: { name: `BrowserQA-${Date.now()}` },
  });
  if (!created.ok()) {
    throw new Error(
      `create project object failed: ${created.status()} ${await created.text()}`,
    );
  }
  const body = (await created.json()) as { id: string };
  return body.id;
}
