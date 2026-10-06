import type { APIRequestContext } from '@playwright/test';
import { baseURL } from './env';

export const backendApi = `${baseURL}/api/backend`;

export async function getExteriorQualificationRefs(request: APIRequestContext) {
  const panelTypes = await request.get(`${backendApi}/panel-types`);
  const panelSizes = await request.get(`${backendApi}/panel-sizes`);
  expectOk(panelTypes);
  expectOk(panelSizes);

  const types = (await panelTypes.json()) as Array<{ id: string; code: string }>;
  const sizes = (await panelSizes.json()) as Array<{
    id: string;
    widthMm: number;
    heightMm: number;
  }>;

  const panelTypeId = types.find((row) => row.code === 'exterior_with_uv')?.id;
  const panelSizeId = sizes.find(
    (row) => row.widthMm === 1220 && row.heightMm === 2440,
  )?.id;

  if (!panelTypeId || !panelSizeId) {
    throw new Error('Missing panel catalog refs for qualification');
  }

  return { panelTypeId, panelSizeId };
}

/** Default catalog refs used in backend E2E calculation requests (wuya + economy). */
export async function getDefaultCalculationItemRefs(
  request: APIRequestContext,
) {
  const { panelTypeId, panelSizeId } = await getExteriorQualificationRefs(request);

  const suppliersRes = await request.get(`${backendApi}/references/suppliers`);
  expectOk(suppliersRes);
  const suppliers = (await suppliersRes.json()) as Array<{
    id: string;
    code: string;
  }>;
  const supplierId = suppliers.find((row) => row.code === 'wuya')?.id;
  if (!supplierId) {
    throw new Error('Supplier wuya missing in QA catalog');
  }

  const qualityRes = await request.get(
    `${backendApi}/suppliers/wuya/quality-classes`,
    { params: { panelType: 'exterior_with_uv' } },
  );
  expectOk(qualityRes);
  const qualities = (await qualityRes.json()) as Array<{
    id: string;
    code: string;
  }>;
  const qualityClassId = qualities.find((row) => row.code === 'economy')?.id;
  if (!qualityClassId) {
    throw new Error('Quality class economy missing for wuya');
  }

  return { panelTypeId, panelSizeId, supplierId, qualityClassId };
}

function expectOk(response: { ok: () => boolean; status: () => number }) {
  if (!response.ok()) {
    throw new Error(`Request failed: ${response.status()}`);
  }
}
