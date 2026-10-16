import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FacadeCalculator } from './facade-calculator';
import type {
  FacadeCalculationArea,
  FacadeCalculationItem,
  FacadeWorkspace,
} from '@/hooks/use-facade-calculation';
import { I18nProvider } from '@/i18n/provider';
import { apiClient } from '@/lib/api-client';

const useAuthMock = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

function axiosError(status: number, code: string, message: string): AxiosError {
  return new AxiosError(message, 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: 'Conflict',
    headers: {},
    config: { headers: {} } as never,
    data: { statusCode: status, errorCode: code, message },
  });
}

const NORMS = [
  ['hpl_panel_1220_3050', 'HPL-панель 1220×3050 мм', 'M2', '1.06', '1060'],
  ['basalt_board_50mm_1_layer', 'Базальтовая плита, 1 слой, 50 мм', 'M2', '1.05', '1050'],
  ['membrane', 'Мембрана', 'M2', '1.16', '1160'],
  ['bracket_50_100_80_t2', 'Кронштейн 50×100×80, t=2,0 мм', 'PCS', '4.03', '4030'],
  ['bracket_50_100_100_t2', 'Кронштейн 50×100×100, t=2,0 мм', 'PCS', '0.81', '810'],
  ['paronite_50_80', 'Паронит под кронштейн 50×80 мм', 'PCS', '4.03', '4030'],
  ['paronite_50_100', 'Паронит под кронштейн 50×100 мм', 'PCS', '0.81', '810'],
  ['profile_t_80_50', 'Профиль вертикальный T 80×50 мм', 'LM', '1.67', '1670'],
  ['profile_l_50_80', 'Профиль угловой L 50×80 мм', 'LM', '0.67', '670'],
  ['profile_l_50_40_slopes', 'Профиль угловой L 50×40 мм на откосы', 'LM', '0.07', '70'],
  ['fire_cut_l_100_50', 'Противопожарная отсечка L 100×50 мм', 'LM', '0.09', '90'],
  ['anchor_8x80', 'Анкер для кронштейна 8×80 мм', 'PCS', '4.03', '4030'],
  ['anchor_10x100', 'Анкер для кронштейна 10×100 мм', 'PCS', '1.61', '1610'],
  ['dowel_nail_8x115', 'Дюбель-гвоздь грибок 8×115', 'PCS', '6.99', '6990'],
  ['epdm_tape_60', 'Лента EPDM 60 мм на профиль', 'LM', '1.34', '1340'],
  ['membrane_tape', 'Лента для мембраны', 'LM', '1.21', '1210'],
  ['rivet_5x10_head_8_10', 'Заклёпки 5×10 мм, шляпка 8–10', 'PCS', '12.09', '12090'],
  ['rivet_hpl_5x15_head_15', 'Заклёпки для HPL 5×15 мм, шляпка 15 мм', 'PCS', '10.75', '10750'],
] as const;

function items(overrides: Partial<FacadeCalculationItem> = {}): FacadeCalculationItem[] {
  return NORMS.map(([code, name, unit, qtyPerM2, qty], index) => ({
    id: `item-${index + 1}`,
    materialId: `mat-${code}`,
    materialCode: code,
    materialName: name,
    category: 'SUBSYSTEM',
    unit,
    spec: null,
    qtyPerM2,
    calculatedQty: qty,
    finalQty: qty,
    isManual: false,
    isExtra: false,
    note: null,
    sortOrder: index + 1,
    ...overrides,
  }));
}

function workspace(overrides: Partial<FacadeWorkspace> = {}): FacadeWorkspace {
  return {
    applicable: true,
    reason: null,
    canEdit: true,
    assignmentId: 'assign-1',
    suggestedArea: {
      value: '1000',
      source: 'ENGINEER_ENTERED',
      ambiguous: false,
    },
    configs: [
      {
        id: 'cfg-base',
        code: 'HPL_FACADE_BASE_1220_3050',
        nameRu: 'Базовая фасадная подсистема 1220×3050',
        nameEn: 'Base',
        nameUz: 'Asosiy',
        isCalculable: true,
        panelWidthMm: 1220,
        panelHeightMm: 3050,
        panelAreaM2: '3.721',
      },
      {
        id: 'cfg-6',
        code: 'HPL_DRY_6MM_50MM',
        nameRu: 'Сухая система 6 мм / 50 мм',
        nameEn: 'Dry 6 mm / 50 mm',
        nameUz: 'Quruq 6 mm / 50 mm',
        isCalculable: true,
        panelWidthMm: 1220,
        panelHeightMm: 3050,
        panelAreaM2: '3.721',
        hplThicknessMm: 6,
        insulationThicknessMm: 50,
        fastening: 'DRY',
        legacy: false,
        selectable: true,
        norms: [],
      },
      {
        id: 'cfg-8',
        code: 'HPL_DRY_8MM_80MM',
        nameRu: 'Сухая система 8 мм / 80 мм',
        nameEn: 'Dry 8 mm / 80 mm',
        nameUz: 'Quruq 8 mm / 80 mm',
        isCalculable: true,
        panelWidthMm: 1220,
        panelHeightMm: 3050,
        panelAreaM2: '3.721',
        hplThicknessMm: 8,
        insulationThicknessMm: 80,
        fastening: 'DRY',
        legacy: false,
        selectable: true,
        norms: [],
      },
      {
        id: 'cfg-glue',
        code: 'HPL_FACADE_GLUE',
        nameRu: 'Клеевая система (нормы не утверждены)',
        nameEn: 'Adhesive',
        nameUz: 'Yelim',
        isCalculable: false,
        panelWidthMm: null,
        panelHeightMm: null,
        panelAreaM2: null,
      },
    ],
    catalog: [
      {
        id: 'mat-hpl_panel_1220_3050',
        code: 'hpl_panel_1220_3050',
        nameRu: 'HPL-панель 1220×3050 мм',
        nameEn: 'HPL panel',
        nameUz: 'HPL panel',
        category: 'HPL',
        unit: 'M2',
        spec: null,
        hasPrice: false,
        price: null,
      },
    ],
    calculation: null,
    quoteCreated: false,
    dealCreated: false,
    ...overrides,
  };
}

function confirmedArea(
  id = 'area-1',
  overrides: Partial<FacadeCalculationArea> = {},
): FacadeCalculationArea {
  return {
    id,
    label: id === 'area-1' ? 'Area A' : 'Area B',
    sortOrder: id === 'area-1' ? 0 : 1,
    hplThicknessMm: id === 'area-1' ? '6' : '8',
    configCode: id === 'area-1' ? 'HPL_DRY_6MM_50MM' : 'HPL_DRY_8MM_80MM',
    normSetCode: id === 'area-1' ? 'HPL_DRY_6MM_50MM_V1' : 'HPL_DRY_8MM_80MM_V1',
    suggestedAreaM2: id === 'area-1' ? '1000' : '30',
    suggestedAreaSource: 'HPL_QUALIFICATION' as const,
    confirmedAreaM2: id === 'area-1' ? '1000' : '30',
    confirmedById: 'engineer-1',
    confirmedByRole: 'ENGINEER',
    confirmationMethod: 'SITE_VISIT',
    confirmedAt: '2026-10-15T10:00:00.000Z',
    confirmed: true,
    items: [],
    ...overrides,
  };
}

function calculatedWorkspace(
  calculationOverrides: Record<string, unknown> = {},
  areas = [confirmedArea()],
) {
  return workspace({
    calculation: {
      id: 'calc-1',
      leadId: 'lead-1',
      assignmentId: 'assign-1',
      engineerId: 'eng-1',
      status: 'CALCULATED',
      revision: 2,
      claddingAreaM2: '1000',
      areaSource: 'ENGINEER_ENTERED',
      notes: null,
      configCode: 'HPL_DRY_6MM_50MM',
      configIsCalculable: true,
      normSetCode: 'HPL_DRY_6MM_50MM_V1',
      ready: true,
      items: [],
      areas,
      ...calculationOverrides,
    },
  });
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return Wrapper;
}

describe('FacadeCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: { permissions: ['engineering:update_technical'] },
    });
  });

  it('calculates 18 positions for 1000 m² and keeps the original rates visible', async () => {
    const user = userEvent.setup();
    const opened = calculatedWorkspace({ status: 'DRAFT', ready: false });
    const calculated = calculatedWorkspace({
      items: items(),
      status: 'CALCULATED',
      revision: 3,
    });
    vi.mocked(apiClient.get).mockResolvedValue({ data: opened });
    vi.mocked(apiClient.put).mockResolvedValue({ data: opened.calculation });
    vi.mocked(apiClient.post).mockResolvedValue({ data: calculated.calculation });

    render(<FacadeCalculator leadId="lead-1" />, { wrapper: createWrapper() });

    await screen.findByRole('button', { name: 'Рассчитать автоматически' });
    await user.click(screen.getByRole('button', { name: 'Рассчитать автоматически' }));

    expect(await screen.findByText('Заклёпки для HPL 5×15 мм, шляпка 15 мм')).toBeInTheDocument();
    expect(screen.getAllByText('HPL-панель 1220×3050 мм').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1.06')[0]).toBeInTheDocument();
    expect(screen.getByDisplayValue('1060')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10750')).toBeInTheDocument();
    expect(screen.getByText('Цена не задана и не считается нулевой')).toBeInTheDocument();
    expect(screen.getByRole('table').className).toContain('md:min-w-[800px]');
    expect(screen.getByRole('table').querySelector('tbody')?.className).toContain(
      'max-md:block',
    );
  });

  it('keeps a manual quantity after reopen and asks before recalc', async () => {
    const user = userEvent.setup();
    const opened = calculatedWorkspace({
      revision: 2,
      items: items().map((item, index) =>
        index === 0 ? { ...item, finalQty: '1100', isManual: true } : item,
      ),
    });
    vi.mocked(apiClient.get).mockResolvedValue({ data: opened });
    vi.mocked(apiClient.put).mockResolvedValue({ data: opened.calculation });
    vi.mocked(apiClient.post).mockRejectedValue(
      axiosError(
        409,
        'FACADE_RECALC_CONFIRMATION_REQUIRED',
        'В расчёте есть ручные корректировки. Подтвердите пересчёт.',
      ),
    );

    render(<FacadeCalculator leadId="lead-1" />, { wrapper: createWrapper() });

    expect(await screen.findByDisplayValue('1100')).toBeInTheDocument();
    expect(screen.getAllByText('Ручная корректировка')[0]).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Рассчитать автоматически' }));
    expect(
      await screen.findByText(
        'Площадь изменится, расчётные количества будут пересчитаны. Итоговые ручные значения сохранятся.',
      ),
    ).toBeInTheDocument();
  });

  it('shows installation-only without an automatic takeoff', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: workspace({
        applicable: false,
        reason: 'INSTALLATION_ONLY',
        canEdit: true,
      }),
    });

    render(<FacadeCalculator leadId="lead-1" />, { wrapper: createWrapper() });

    expect(
      await screen.findByText(
        'Заказан только монтаж. Автоматический расчёт подсистемы не создаётся.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Рассчитать автоматически' }),
    ).not.toBeInTheDocument();
  });

  it('shows the thickness groups and saves an engineer site-visit confirmation', async () => {
    const user = userEvent.setup();
    const suggestions = workspace({
      thicknessConflict: true,
      hplThicknessesMm: [6, 8],
      suggestedAreas: [
        {
          label: 'HPL 6 mm',
          hplThicknessMm: 6,
          suggestedAreaM2: '50',
          suggestedAreaSource: 'HPL_QUALIFICATION',
          ambiguous: false,
          configCode: 'HPL_DRY_6MM_50MM',
        },
        {
          label: 'HPL 8 mm',
          hplThicknessMm: 8,
          suggestedAreaM2: '30',
          suggestedAreaSource: 'HPL_QUALIFICATION',
          ambiguous: false,
          configCode: 'HPL_DRY_8MM_80MM',
        },
      ],
      calculation: null,
    });
    const saved = calculatedWorkspace(
      { status: 'DRAFT', revision: 2, ready: false },
      [
        confirmedArea('area-1', {
          label: 'HPL 6 mm',
          suggestedAreaM2: '50',
          confirmedAreaM2: null,
          confirmed: false,
          confirmedAt: null,
          confirmedById: null,
          confirmedByRole: null,
          confirmationMethod: null,
        }),
        confirmedArea('area-2', {
          label: 'HPL 8 mm',
          suggestedAreaM2: '30',
          confirmedAreaM2: null,
          confirmed: false,
          confirmedAt: null,
          confirmedById: null,
          confirmedByRole: null,
          confirmationMethod: null,
        }),
      ],
    );
    vi.mocked(apiClient.get).mockResolvedValue({ data: suggestions });
    vi.mocked(apiClient.put).mockResolvedValue({ data: saved.calculation });
    vi.mocked(apiClient.post).mockResolvedValue({ data: saved.calculation });

    render(<FacadeCalculator leadId="lead-1" />, { wrapper: createWrapper() });

    expect(await screen.findByDisplayValue('HPL 6 mm')).toBeInTheDocument();
    expect(screen.getByDisplayValue('HPL 8 mm')).toBeInTheDocument();
    await user.click(
      screen.getAllByRole('button', { name: 'Подтвердить после выезда' })[0],
    );

    expect(apiClient.put).toHaveBeenCalledWith(
      '/engineering/leads/lead-1/facade/areas',
      expect.objectContaining({
        areas: expect.arrayContaining([
          expect.objectContaining({ hplThicknessMm: '6', configCode: 'HPL_DRY_6MM_50MM' }),
          expect.objectContaining({ hplThicknessMm: '8', configCode: 'HPL_DRY_8MM_80MM' }),
        ]),
      }),
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      '/engineering/leads/lead-1/facade/areas/area-1/confirm',
      expect.objectContaining({ confirmedAreaM2: '50' }),
    );
  });

  it('loads the remote reviewer workspace and confirms through the remote route', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({
      user: { permissions: ['facade:confirm_area_remote'] },
    });
    const review = calculatedWorkspace(
      { status: 'DRAFT', revision: 4, ready: false },
      [
        confirmedArea('area-1', {
          confirmedAreaM2: null,
          confirmed: false,
          confirmedAt: null,
          confirmedById: null,
          confirmedByRole: null,
          confirmationMethod: null,
        }),
      ],
    );
    review.canEdit = false;
    vi.mocked(apiClient.get).mockResolvedValue({ data: review });
    vi.mocked(apiClient.post).mockResolvedValue({ data: review.calculation });

    render(<FacadeCalculator leadId="lead-1" />, { wrapper: createWrapper() });

    await screen.findByRole('button', { name: 'Подтвердить удалённо' });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/engineering/leads/lead-1/facade/remote-workspace',
    );
    await user.click(screen.getByRole('button', { name: 'Подтвердить удалённо' }));
    expect(apiClient.post).toHaveBeenCalledWith(
      '/engineering/leads/lead-1/facade/areas/area-1/remote-confirm',
      expect.objectContaining({ confirmedAreaM2: '1000' }),
    );
  });

  it('requires reconfirmation after the confirmed area is edited', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: calculatedWorkspace({ items: items() }),
    });
    render(<FacadeCalculator leadId="lead-1" />, { wrapper: createWrapper() });

    const calculateButton = await screen.findByRole('button', {
      name: 'Рассчитать автоматически',
    });
    expect(calculateButton).toBeEnabled();
    const confirmedAreaInput = screen.getByLabelText('Подтверждённая площадь, м²');
    await user.clear(confirmedAreaInput);
    await user.type(confirmedAreaInput, '900');
    expect(calculateButton).toBeDisabled();
  });

  it('does not start a calculation without saved, confirmed area data', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: workspace() });
    render(<FacadeCalculator leadId="lead-1" />, { wrapper: createWrapper() });
    expect(
      await screen.findByRole('button', { name: 'Рассчитать автоматически' }),
    ).toBeDisabled();
  });

  it('renders catalog material names in the active locale, not the RU snapshot', async () => {
    const opened = workspace({
      calculation: {
        id: 'calc-1',
        leadId: 'lead-1',
        assignmentId: 'assign-1',
        engineerId: 'eng-1',
        status: 'CALCULATED',
        revision: 1,
        claddingAreaM2: '1000',
        areaSource: 'ENGINEER_ENTERED',
        notes: null,
        configCode: 'HPL_FACADE_BASE_1220_3050',
        configIsCalculable: true,
        normSetCode: 'HPL_FACADE_BASE_1220_3050_V1',
        ready: true,
        items: [
          {
            id: 'item-1',
            materialId: 'mat-hpl_panel_1220_3050',
            materialCode: 'hpl_panel_1220_3050',
            materialName: 'HPL-панель 1220×3050 мм',
            category: 'HPL',
            unit: 'M2',
            spec: null,
            qtyPerM2: '1.06',
            calculatedQty: '1060',
            finalQty: '1060',
            isManual: false,
            isExtra: false,
            note: null,
            sortOrder: 1,
          },
        ],
      },
    });
    vi.mocked(apiClient.get).mockResolvedValue({ data: opened });

    render(
      <I18nProvider initialLocale="en">
        <FacadeCalculator leadId="lead-1" />
      </I18nProvider>,
      { wrapper: createWrapper() },
    );

    const names = await screen.findAllByText('HPL panel');
    expect(names.length).toBeGreaterThan(0);
    expect(screen.queryByText('HPL-панель 1220×3050 мм')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Calculate automatically' })).toBeInTheDocument();
  });
});
