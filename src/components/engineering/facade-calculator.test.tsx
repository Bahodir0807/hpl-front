import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FacadeCalculator } from './facade-calculator';
import type {
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
    const calculated = workspace({
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
        items: items(),
      },
    });
    vi.mocked(apiClient.get).mockResolvedValue({ data: workspace() });
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
    expect(screen.getByRole('table').className).toContain('md:min-w-[720px]');
    expect(screen.getByRole('table').querySelector('tbody')?.className).toContain(
      'max-md:block',
    );
  });

  it('keeps a manual quantity after reopen and asks before recalc', async () => {
    const user = userEvent.setup();
    const opened = workspace({
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
        configCode: 'HPL_FACADE_BASE_1220_3050',
        configIsCalculable: true,
        normSetCode: 'HPL_FACADE_BASE_1220_3050_V1',
        ready: true,
        items: items().map((item, index) =>
          index === 0
            ? {
                ...item,
                finalQty: '1100',
                isManual: true,
              }
            : item,
        ),
      },
    });
    vi.mocked(apiClient.get).mockResolvedValue({ data: opened });
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

  it('warns that an unsupported configuration has no fake calculation', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({ data: workspace() });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        id: 'calc-2',
        leadId: 'lead-1',
        assignmentId: 'assign-1',
        engineerId: 'eng-1',
        status: 'UNSUPPORTED',
        revision: 1,
        claddingAreaM2: '1000',
        areaSource: 'ENGINEER_ENTERED',
        notes: null,
        configCode: 'HPL_FACADE_GLUE',
        configIsCalculable: false,
        normSetCode: null,
        ready: false,
        items: [],
        quoteCreated: false,
        dealCreated: false,
      },
    });

    render(<FacadeCalculator leadId="lead-1" />, { wrapper: createWrapper() });

    await screen.findByLabelText('Конфигурация фасада');
    await user.selectOptions(
      screen.getByLabelText('Конфигурация фасада'),
      'HPL_FACADE_GLUE',
    );
    await user.click(screen.getByRole('button', { name: 'Рассчитать автоматически' }));

    expect(
      await screen.findByText(
        'Неполный расчёт не считается готовым. Автоматический расход не выдаётся.',
      ),
    ).toBeInTheDocument();
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
