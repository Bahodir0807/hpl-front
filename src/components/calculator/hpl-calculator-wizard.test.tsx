import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HplCalculatorWizard } from './hpl-calculator-wizard';

const useAuthMock = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/use-panels', () => ({
  usePanelTypes: () => ({
    data: [{ id: 'type-1', code: 'interior', displayNameRu: 'Интерьерный' }],
    isLoading: false,
    isError: false,
  }),
  useSuppliers: () => ({
    data: [{ id: 'sup-1', code: 'tianran', name: 'Tianran', deliveryDays: 14 }],
    isLoading: false,
    isError: false,
  }),
  usePanelSizes: () => ({ data: [], isLoading: false }),
  usePanelColors: () => ({ data: [], isLoading: false }),
  useSupplierQualityClasses: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    isSuccess: true,
  }),
  useCreatePanelColor: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-calculations', () => ({
  useCalculationPreview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateCalculation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useFinalizeCalculation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-quotes', () => ({
  useConvertCalculationToQuote: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-currency-rates', () => ({
  useCurrentCurrencyRate: () => ({
    data: { fromCurrency: 'CNY', toCurrency: 'USD', rate: '0.15' },
    isError: false,
    isLoading: false,
  }),
}));

function auth(permissions: string[], roles: string[]) {
  return {
    user: {
      id: 'user-1',
      email: 'user@hpl.local',
      roles,
      permissions,
    },
    hasPermission: (slug: string) => permissions.includes(slug),
    isInitialized: true,
    login: vi.fn(),
    logout: vi.fn(),
  };
}

const qualification = {
  application: 'INTERIOR',
  panelTypeId: 'type-1',
  panelType: { id: 'type-1', code: 'interior', displayNameRu: 'Интерьерный' },
  thicknessMm: 8,
  panelSizeId: 'size-1',
  panelSize: { displayName: '1220 × 2440 мм', widthMm: 1220, heightMm: 2440 },
  colorCode: 'RAL-9005',
  colorName: 'Чёрный',
  requiredAreaM2: 20,
  installationRequired: true,
};

describe('HplCalculatorWizard commercial authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks MANAGER from running commercial calculation even with calculations:create', () => {
    useAuthMock.mockReturnValue(
      auth(
        [
          'calculations:create',
          'calculations:read',
          'quotes:create',
          'quotes:update',
        ],
        ['MANAGER'],
      ),
    );

    render(
      <HplCalculatorWizard
        leadId="lead-1"
        qualification={qualification}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Коммерческий расчёт ожидает руководителя.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Рассчитать' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Поставщик')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Закупочная цена, CNY/м²'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Коммерческие условия КП'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Срок производства'),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Дата КП')).not.toBeInTheDocument();
  });

  it('lets HEAD see Stage 1 context and supplier selection before calculating', () => {
    useAuthMock.mockReturnValue(
      auth(
        [
          'leads:commercial_qualify',
          'calculations:create',
          'calculations:read_all',
          'quotes:create',
          'quotes:approve',
        ],
        ['HEAD'],
      ),
    );

    render(
      <HplCalculatorWizard
        leadId="lead-1"
        qualification={qualification}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Контекст Stage 1')).toBeInTheDocument();
    expect(screen.getAllByText('Интерьерный').length).toBeGreaterThan(0);
    expect(screen.getByText('8 мм')).toBeInTheDocument();
    expect(screen.getByText('20 м²')).toBeInTheDocument();
    expect(screen.getByText('Да')).toBeInTheDocument();
    expect(screen.getByText('2. Поставщик')).toBeInTheDocument();
    expect(
      screen.queryByText('Коммерческий расчёт ожидает руководителя.'),
    ).not.toBeInTheDocument();
  });

  it('blocks DIRECTOR from the wizard unless backend grants calculations:create', () => {
    useAuthMock.mockReturnValue(
      auth(['calculations:read', 'calculations:read_all', 'quotes:read_all'], [
        'DIRECTOR',
      ]),
    );

    render(
      <HplCalculatorWizard
        leadId="lead-1"
        qualification={qualification}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Коммерческий расчёт ожидает руководителя.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Рассчитать' }),
    ).not.toBeInTheDocument();
  });
});
