import { describe, expect, it } from 'vitest';
import type { CalculationRequest } from '@/types/hpl';
import {
  CUSTOM_SIZE_INTEGER_MESSAGE,
  HALF_FILLED_CUSTOM_SIZE_MESSAGE,
  SHEETS_COUNT_PLACEHOLDER,
  canConvertCalculationRequestToQuote,
  canConvertRequestToQuote,
  canFinalizeQuote,
  calculationRequestStatusLabel,
  createEmptyRequestForm,
  createEmptyRequestItem,
  duplicateRequestItem,
  isDraftCalculationRequest,
  isSubmittedCalculationRequest,
  previewSheetsCount,
  REQUEST_CONVERT_TO_QUOTE_PATH,
  requestItemSheetsCountDisplay,
  serializeCalculationRequest,
  unknownCalculationRequestWriteKeys,
  validateRequestForm,
  requestFormFromApi,
  qualityClassStillAvailable,
  unwrapRequestCalculations,
  type CalculationRequestItemForm,
} from './calculation-request';
import { isOtherPanelType } from './hpl-domain';

const PANEL_TYPES = [
  { id: 'type-interior', code: 'interior', displayNameRu: 'Интерьер' },
  { id: 'type-other', code: 'other', displayNameRu: 'Другой' },
];

function filledItem(
  overrides: Partial<CalculationRequestItemForm> = {},
): CalculationRequestItemForm {
  return {
    ...createEmptyRequestItem(),
    qualityClassId: 'q-medium',
    panelTypeId: 'type-interior',
    thicknessMm: '8',
    panelSizeId: 'size-1',
    requiredAreaM2: '30',
    ...overrides,
  };
}

describe('calculation request form helpers', () => {
  it('lets a manager create a request while HEAD-only convert stays gated', () => {
    expect(
      canConvertCalculationRequestToQuote(['calculations:create', 'quotes:create']),
    ).toBe(false);
    expect(canConvertCalculationRequestToQuote(['quotes:approve'])).toBe(true);
    expect(canFinalizeQuote(['quotes:approve'])).toBe(true);
    expect(canFinalizeQuote(['quotes:create'])).toBe(false);
  });

  it('adds a second calculation group without colliding persisted ids', () => {
    const form = createEmptyRequestForm();
    form.calculations[0].id = 'session-1';
    form.calculations[0].items[0].id = 'item-1';
    form.calculations.push({
      key: 'calc-2',
      title: 'Расчёт №2',
      items: [duplicateRequestItem(form.calculations[0].items[0])],
    });

    const duplicated = form.calculations[1].items[0];
    expect(duplicated.id).toBeUndefined();
    expect(duplicated.key).not.toBe(form.calculations[0].items[0].key);
    expect(duplicated).not.toHaveProperty('supplierId');
  });

  it('duplicates technical fields without copying persisted sheetsCount', () => {
    const source = Object.assign(
      filledItem({
        id: 'item-1',
        sheetsCount: '999',
        requiredAreaM2: '1000',
        panelSizeId: 'size-1830',
        coating: 'PE',
        colorId: 'color-wenge',
        colorName: 'Wenge',
      }),
      { supplierId: 'legacy-supplier' },
    );
    const duplicated = duplicateRequestItem(source);

    expect(duplicated.id).toBeUndefined();
    expect(duplicated.sheetsCount).toBe('');
    expect(duplicated).not.toHaveProperty('supplierId');
    expect(duplicated.qualityClassId).toBe(source.qualityClassId);
    expect(duplicated.panelTypeId).toBe(source.panelTypeId);
    expect(duplicated.coating).toBe('PE');
    expect(duplicated.panelSizeId).toBe('size-1830');
    expect(duplicated.thicknessMm).toBe(source.thicknessMm);
    expect(duplicated.requiredAreaM2).toBe('1000');
    expect(duplicated.colorId).toBe('color-wenge');
    expect(
      requestItemSheetsCountDisplay(duplicated, {
        widthMm: 1830,
        heightMm: 3050,
      }),
    ).toBe('180 шт.');
  });

  it('maps Decor UI selection to colorId and never sends decor or colorName', () => {
    const form = createEmptyRequestForm();
    form.calculations[0].items[0] = filledItem({
      colorId: 'color-wenge',
      colorName: 'Wenge',
    });

    const payload = serializeCalculationRequest(form, { leadId: 'lead-1' });
    expect(payload.calculations[0].items[0].colorId).toBe('color-wenge');
    expect(payload.calculations[0].items[0]).not.toHaveProperty('decor');
    expect(payload.calculations[0].items[0]).not.toHaveProperty('colorName');
  });

  it('never serializes sheetsCount on manager POST or PATCH payloads', () => {
    const form = createEmptyRequestForm();
    form.calculations[0].items[0] = filledItem({
      id: 'item-1',
      sheetsCount: '180',
      requiredAreaM2: '1000',
    });

    const created = serializeCalculationRequest(form, { leadId: 'lead-1' });
    expect(created.calculations[0].items[0]).not.toHaveProperty('sheetsCount');
    expect(JSON.stringify(created)).not.toContain('sheetsCount');

    const patched = serializeCalculationRequest(form);
    expect(patched).not.toHaveProperty('leadId');
    expect(patched.calculations[0].items[0]).not.toHaveProperty('sheetsCount');
    expect(JSON.stringify(patched)).not.toContain('sheetsCount');
  });

  it('treats sheetsCount in a write payload as an unknown manager DTO field', () => {
    expect(
      unknownCalculationRequestWriteKeys(
        {
          leadId: 'lead-1',
          calculations: [
            {
              title: 'Расчёт №1',
              items: [
                {
                  panelTypeId: 'type-interior',
                  supplierId: 'sup-1',
                  qualityClassId: 'q-medium',
                  thicknessMm: '8',
                  requiredAreaM2: '1000',
                  sheetsCount: 180,
                },
              ],
            },
          ],
        },
        'create',
      ),
    ).toEqual([
      'calculations[0].items[0].supplierId',
      'calculations[0].items[0].sheetsCount',
    ]);
  });

  it('does not block submit on a leftover sheetsCount form value', () => {
    const form = createEmptyRequestForm();
    form.calculations[0].items[0] = filledItem({ sheetsCount: '0' });

    expect(validateRequestForm(form, PANEL_TYPES).valid).toBe(true);
    const payload = serializeCalculationRequest(form, { leadId: 'lead-1' });
    expect(payload.calculations[0].items[0]).not.toHaveProperty('sheetsCount');
  });

  it('serializes customWidthMm and customHeightMm only as a complete pair', () => {
    const form = createEmptyRequestForm();
    form.calculations[0].items[0] = filledItem({
      customWidthMm: '1230',
      customHeightMm: '3050',
    });

    const payload = serializeCalculationRequest(form, { leadId: 'lead-1' });
    expect(payload.calculations[0].items[0]).toMatchObject({
      panelSizeId: 'size-1',
      customWidthMm: 1230,
      customHeightMm: 3050,
    });
  });

  it('omits an incomplete custom size pair from the write payload', () => {
    const form = createEmptyRequestForm();
    form.calculations[0].items[0] = filledItem({
      customWidthMm: '1230',
      customHeightMm: '',
    });

    const payload = serializeCalculationRequest(form, { leadId: 'lead-1' });
    expect(payload.calculations[0].items[0]).not.toHaveProperty('customWidthMm');
    expect(payload.calculations[0].items[0]).not.toHaveProperty('customHeightMm');
  });

  it('blocks half-filled custom size in validation', () => {
    const form = createEmptyRequestForm();
    form.calculations[0].items[0] = filledItem({
      customWidthMm: '1230',
      customHeightMm: '',
    });

    const result = validateRequestForm(form, PANEL_TYPES);
    expect(result.valid).toBe(false);
    expect(result.itemErrors[form.calculations[0].items[0].key]?.customWidthMm).toBe(
      HALF_FILLED_CUSTOM_SIZE_MESSAGE,
    );
    expect(result.itemErrors[form.calculations[0].items[0].key]?.customHeightMm).toBe(
      HALF_FILLED_CUSTOM_SIZE_MESSAGE,
    );
  });

  it('still requires panelSizeId when a custom size snapshot is present', () => {
    const form = createEmptyRequestForm();
    form.calculations[0].items[0] = filledItem({
      panelSizeId: '',
      customWidthMm: '1230',
      customHeightMm: '3050',
    });

    const result = validateRequestForm(form, PANEL_TYPES);
    expect(result.valid).toBe(false);
    expect(result.itemErrors[form.calculations[0].items[0].key]?.panelSizeId).toBe(
      'Укажите размер',
    );
  });

  it('serializes a manager CalculationRequest without purchasePricePerM2Cny or unknown DTO fields', () => {
    const form = createEmptyRequestForm();
    form.notes = 'Нужен CIP Tashkent';
    form.calculations[0].id = 'session-should-not-be-sent';
    form.calculations[0].title = 'Фасад офиса';
    form.calculations[0].items[0] = filledItem({
      id: 'item-should-not-be-sent',
      sheetsCount: '10',
      coating: 'PE',
      colorId: 'color-wenge',
      colorName: 'Wenge',
      texture: 'Wood',
      note: 'Фасад',
      customWidthMm: '1230',
      customHeightMm: '3050',
    });
    form.calculations.push({
      key: 'calc-2',
      title: 'Расчёт №2',
      items: [
        filledItem({
          qualityClassId: 'q-premium',
          panelTypeId: 'type-other',
          thicknessMm: '6',
          panelSizeId: 'size-2',
          requiredAreaM2: '12.5',
          customTypeDescription: 'Спец. лаборатория',
        }),
        filledItem({
          qualityClassId: 'q-premium',
          panelTypeId: 'type-interior',
          thicknessMm: '8',
          panelSizeId: 'size-1',
          requiredAreaM2: '18',
          coating: 'UV',
          colorId: 'color-black',
          colorName: 'Чёрный',
        }),
      ],
    });

    const payload = serializeCalculationRequest(form, { leadId: 'lead-1' });
    expect(payload).toEqual({
      leadId: 'lead-1',
      notes: 'Нужен CIP Tashkent',
      calculations: [
        {
          title: 'Фасад офиса',
          items: [
            {
              panelTypeId: 'type-interior',
              qualityClassId: 'q-medium',
              thicknessMm: '8',
              panelSizeId: 'size-1',
              colorId: 'color-wenge',
              coating: 'PE',
              texture: 'Wood',
              requiredAreaM2: '30',
              customWidthMm: 1230,
              customHeightMm: 3050,
              note: 'Фасад',
            },
          ],
        },
        {
          title: 'Расчёт №2',
          items: [
            {
              panelTypeId: 'type-other',
              qualityClassId: 'q-premium',
              thicknessMm: '6',
              panelSizeId: 'size-2',
              requiredAreaM2: '12.5',
              customTypeDescription: 'Спец. лаборатория',
            },
            {
              panelTypeId: 'type-interior',
              qualityClassId: 'q-premium',
              thicknessMm: '8',
              panelSizeId: 'size-1',
              colorId: 'color-black',
              coating: 'UV',
              requiredAreaM2: '18',
            },
          ],
        },
      ],
    });
    expect(payload).not.toHaveProperty('dealId');
    expect(payload).not.toHaveProperty('clientId');
    expect(payload).not.toHaveProperty('sessions');
    expect(payload.calculations[0]).not.toHaveProperty('id');
    expect(payload.calculations[0]).not.toHaveProperty('sortOrder');
    expect(payload.calculations[0].items[0]).not.toHaveProperty('id');
    expect(payload.calculations[0].items[0]).not.toHaveProperty('decor');
    expect(payload.calculations[0].items[0]).not.toHaveProperty('colorName');
    expect(payload.calculations[0].items[0]).not.toHaveProperty('sheetsCount');
    expect(JSON.stringify(payload)).not.toContain('supplierId');
    expect(payload.calculations[0].items[0]).not.toHaveProperty(
      'purchasePricePerM2Cny',
    );
    expect(unknownCalculationRequestWriteKeys(payload, 'create')).toEqual([]);
  });

  it('omits leadId from PATCH serialization and can clear notes', () => {
    const form = createEmptyRequestForm();
    form.notes = '';
    form.calculations[0].items[0] = filledItem();
    const payload = serializeCalculationRequest(form);

    expect(payload).not.toHaveProperty('leadId');
    expect(payload.notes).toBe('');
    expect(unknownCalculationRequestWriteKeys(payload, 'patch')).toEqual([]);
  });

  it('rejects 0, negative and fractional custom dimensions', () => {
    const form = createEmptyRequestForm();
    form.calculations[0].items[0] = filledItem({
      customWidthMm: '0',
      customHeightMm: '1200.5',
    });

    const result = validateRequestForm(form, PANEL_TYPES);
    expect(result.valid).toBe(false);
    expect(result.itemErrors[form.calculations[0].items[0].key]?.customWidthMm).toBe(
      CUSTOM_SIZE_INTEGER_MESSAGE,
    );
  });

  it('keeps requiredAreaM2 decimal scale without inventing a float', () => {
    const form = createEmptyRequestForm();
    form.calculations[0].items[0] = filledItem({ requiredAreaM2: '30.5' });
    const payload = serializeCalculationRequest(form, { leadId: 'lead-1' });
    expect(payload.calculations[0].items[0].requiredAreaM2).toBe('30.5');
  });

  it('does not convert a request that already has a quote', () => {
    expect(
      canConvertRequestToQuote({ status: 'submitted', quotes: [] }),
    ).toBe(true);
    expect(
      canConvertRequestToQuote({
        status: 'processing',
        quotes: [{ id: 'quote-1' }],
      }),
    ).toBe(false);
    expect(canConvertRequestToQuote({ status: 'quoted' })).toBe(false);
    expect(canConvertRequestToQuote({ status: 'draft' })).toBe(false);
  });

  it('treats only draft as editable and does not treat a missing status as a draft', () => {
    expect(isDraftCalculationRequest('draft')).toBe(true);
    expect(isDraftCalculationRequest('submitted')).toBe(false);
    expect(isDraftCalculationRequest('processing')).toBe(false);
    expect(isDraftCalculationRequest('quoted')).toBe(false);
    expect(isDraftCalculationRequest(undefined)).toBe(false);
  });

  it('requires customTypeDescription for catalog type other', () => {
    const form = createEmptyRequestForm();
    form.calculations[0].items[0] = filledItem({
      panelTypeId: 'type-other',
      requiredAreaM2: '10',
    });

    expect(isOtherPanelType(PANEL_TYPES[1])).toBe(true);
    const without = validateRequestForm(form, PANEL_TYPES);
    expect(without.valid).toBe(false);
    expect(
      without.itemErrors[form.calculations[0].items[0].key]
        ?.customTypeDescription,
    ).toBeTruthy();

    form.calculations[0].items[0].customTypeDescription = 'Нестандарт';
    expect(validateRequestForm(form, PANEL_TYPES).valid).toBe(true);
  });

  it('resets an invalid manufacturer → class mapping', () => {
    expect(
      qualityClassStillAvailable('q-premium', [
        { id: 'q-economy', code: 'economy', nameRu: 'Эконом' },
      ]),
    ).toBe(false);
    expect(
      qualityClassStillAvailable('q-economy', [
        { id: 'q-economy', code: 'economy', nameRu: 'Эконом' },
      ]),
    ).toBe(true);
  });

  it('restores GET technical fields including decor display from colorId/colorName', () => {
    const request: CalculationRequest = {
      id: 'req-1',
      status: 'processing',
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-20T10:00:00.000Z',
      calculations: [
        {
          id: 'calc-1',
          title: 'Расчёт №1',
          items: [
            {
              panelTypeId: 'type-1',
              supplierId: 'sup-1',
              qualityClassId: 'q-medium',
              thicknessMm: '8',
              panelSizeId: 'size-1',
              sheetsCount: 10,
              customWidthMm: 1230,
              customHeightMm: 3050,
              coating: 'PE',
              texture: 'Wood',
              customTypeDescription: 'Спец. лаборатория',
              colorId: 'color-wenge',
              colorName: 'Wenge',
              color: { id: 'color-wenge', colorName: 'Wenge' },
              requiredAreaM2: '30',
            },
          ],
          createdAt: '2026-08-20T10:00:00.000Z',
          updatedAt: '2026-08-20T10:00:00.000Z',
        },
      ],
    };

    expect(unwrapRequestCalculations(request)).toHaveLength(1);
    expect(isSubmittedCalculationRequest(request.status)).toBe(true);
    expect(calculationRequestStatusLabel('processing')).toBe('На проверке');

    const hydrated = requestFormFromApi(request).calculations[0].items[0];
    expect(requestFormFromApi(request).calculations[0].title).toBe('Расчёт №1');
    expect(requestFormFromApi(request).calculations[0].items).toHaveLength(1);
    expect(hydrated.sheetsCount).toBe('10');
    expect(hydrated.customWidthMm).toBe('1230');
    expect(hydrated.customHeightMm).toBe('3050');
    expect(hydrated.colorId).toBe('color-wenge');
    expect(hydrated.colorName).toBe('Wenge');
    expect(hydrated.coating).toBe('PE');
    expect(hydrated.texture).toBe('Wood');
    expect(hydrated.customTypeDescription).toBe('Спец. лаборатория');
    expect(hydrated.panelSizeId).toBe('size-1');

    const patched = serializeCalculationRequest(requestFormFromApi(request));
    expect(patched.calculations[0].items[0]).not.toHaveProperty('sheetsCount');
    expect(patched.calculations[0].items[0]).not.toHaveProperty('supplierId');
  });

  it('hydrates sheetsCount 0 and decor display from nested color snapshot', () => {
    const request: CalculationRequest = {
      id: 'req-2',
      status: 'draft',
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-20T10:00:00.000Z',
      calculations: [
        {
          id: 'calc-2',
          title: 'Расчёт №1',
          items: [
            {
              panelTypeId: 'type-1',
              supplierId: 'sup-1',
              thicknessMm: '8',
              sheetsCount: 0,
              colorId: 'color-oak',
              color: { colorCode: 'W100', colorName: 'White Oak' },
            },
          ],
          createdAt: '2026-08-20T10:00:00.000Z',
          updatedAt: '2026-08-20T10:00:00.000Z',
        },
      ],
    };

    const hydrated = requestFormFromApi(request).calculations[0].items[0];
    expect(hydrated.sheetsCount).toBe('0');
    expect(hydrated.colorId).toBe('color-oak');
    expect(hydrated.colorName).toBe('W100 · White Oak');
  });

  it('previews sheetsCount from catalog widthMm/heightMm, rounding up', () => {
    const size1830 = { widthMm: 1830, heightMm: 3050 };

    expect(previewSheetsCount('1000', size1830)).toBe(180);
    expect(previewSheetsCount('1.1', { widthMm: 1000, heightMm: 1000 })).toBe(2);
    expect(previewSheetsCount('', size1830)).toBeNull();
    expect(previewSheetsCount('0', size1830)).toBeNull();
    expect(previewSheetsCount('1000', undefined)).toBeNull();
    expect(
      previewSheetsCount('1000', { widthMm: undefined, heightMm: undefined }),
    ).toBeNull();
  });

  it('shows persisted GET sheetsCount until size/area preview takes over', () => {
    const size1830 = { widthMm: 1830, heightMm: 3050 };
    const persisted = filledItem({
      id: 'item-1',
      sheetsCount: '180',
      requiredAreaM2: '1000',
      panelSizeId: 'size-1830',
    });

    expect(requestItemSheetsCountDisplay(persisted, size1830)).toBe('180 шт.');
    expect(
      requestItemSheetsCountDisplay(
        { ...persisted, requiredAreaM2: '', sheetsCount: '180' },
        size1830,
      ),
    ).toBe('180 шт.');
    expect(
      requestItemSheetsCountDisplay(
        { ...createEmptyRequestItem(), requiredAreaM2: '1000' },
        size1830,
      ),
    ).toBe('180 шт.');
    expect(
      requestItemSheetsCountDisplay(createEmptyRequestItem(), size1830),
    ).toBe(SHEETS_COUNT_PLACEHOLDER);
    expect(
      requestItemSheetsCountDisplay(
        { ...createEmptyRequestItem(), requiredAreaM2: '1000' },
        undefined,
      ),
    ).toBe(SHEETS_COUNT_PLACEHOLDER);
  });

  it('uses the request convert path rather than legacy convert', () => {
    expect(REQUEST_CONVERT_TO_QUOTE_PATH).toBe(
      '/calculations/requests/:id/convert-to-quote',
    );
  });
});
