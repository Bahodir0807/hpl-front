import type { APIRequestContext } from '@playwright/test';
import { LEAD_PREFIX } from './qa-data';

type LeadRow = { id: string; title: string };

export async function cleanupBrowserQaLeads(
  request: APIRequestContext,
  apiBase: string,
): Promise<number> {
  const list = await request.get(`${apiBase}/leads`, {
    params: { limit: 100, page: 1 },
  });
  if (!list.ok()) {
    return 0;
  }

  const payload = (await list.json()) as {
    items?: LeadRow[];
    data?: LeadRow[];
  };
  const rows = payload.items ?? payload.data ?? [];
  let removed = 0;

  for (const lead of rows) {
    if (!lead.title?.startsWith(LEAD_PREFIX)) {
      continue;
    }
    const response = await request.delete(`${apiBase}/leads/${lead.id}`);
    if (response.ok()) {
      removed += 1;
    }
  }

  return removed;
}
