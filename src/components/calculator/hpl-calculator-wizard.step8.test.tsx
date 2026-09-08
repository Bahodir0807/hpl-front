import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HplCalculatorWizard } from './hpl-calculator-wizard';
import { PRICING_NOT_CONFIGURED_MESSAGE } from '@/lib/hpl-errors';
import {
  defaultQuoteValidUntilInput,
} from '@/lib/quote-commercial-terms';
import { formatDate } from '@/lib/format';

const useAuthMock = vi.fn();
const previewMutateAsync = vi.fn();
const createMutateAsync = vi.fn();
const finalizeMutateAsync = vi.fn();
const convertMutateAsync = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/use-panels', () => ({
  usePanelTypes: () => ({
    data: [{ id: 'type-furniture', code: 'furniture', displayNameRu: 'Мебельный' }],
    isLoading: false,
    isError: false,
  }),
  useSuppliers: () => ({
    data: [{ id: 'sup-wuya', code: 'wuya', name: 'Wuya', deliveryDays: 21 }],
    isLoading: false,
    isError: false,
  }),
  usePanelSizes: () => ({
    data: [
      {
        id: 'size-1525',
        widthMm: 1525,
        heightMm: 1830,
        displayName: '1525×1830',
        areaM2: 2.79075,
      },
    ],
    isLoading: false,
  }),
  usePanelColors: () => ({
    data: [{ id: 'color-1', supplierId: 'sup-wuya', name: 'Белый', code: 'W100' }],
    isLoading: false,
  }),
  useSupplierQualityClasses: () => ({
    data: [{ id: 'quality-economy', code: 'economy', nameRu: 'Эконом' }],
    isLoading: false,
    isFetching: false,
    isSuccess: true,
  }),
  useCreatePanelColor: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-calculations', () => ({
  useCalculationPreview: () => ({
    mutateAsync: previewMutateAsync,
    isPending: false,
  }),
  useCreateCalculation: () => ({
    mutateAsync: createMutateAsync,
    isPending: false,
  }),
  useFinalizeCalculation: () => ({
    mutateAsync: finalizeMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/use-quotes', () => ({
  useConvertCalculationToQuote: () => ({
    mutateAsync: convertMutateAsync,
    isPending: false,
  }),
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

const HEAD_PERMISSIONS = [
  'leads:commercial_qualify',
  'calculations:create',
  'calculations:read_all',
  'quotes:create',
  'quotes:approve',
];

const qualification = {
  application: 'FURNITURE' as const,
  panelTypeId: 'type-furniture',
  panelType: { id: 'type-furniture', code: 'furniture', displayNameRu: 'Мебельный' },
  thicknessMm: 2.9,
  panelSizeId: 'size-1525',
  panelSize: { displayName: '1525×1830', widthMm: 1525, heightMm: 1830, areaM2: 2.79075 },
  colorCode: 'W100',
  colorName: 'Белый',
  requiredAreaM2: 1000,
  installationRequired: false,
};

function renderWizard() {
  return render(
    <HplCalculatorWizard
      leadId="lead-1"
      qualification={qualification}
      commercialSupplierId="sup-wuya"
      commercialQualityClassId="quality-economy"
      onClose={vi.fn()}
    />,
  );
}

async function openStep8(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Мебельный' }));
  await user.click(screen.getByRole('button', { name: /Вуя/ }));
  await user.click(screen.getByRole('button', { name: 'Далее' }));
  await user.click(screen.getByRole('button', { name: /1525×1830/ }));
  await user.click(screen.getByRole('button', { name: /Белый/ }));
  await user.click(screen.getByRole('button', { name: 'Далее' }));
  await user.click(screen.getByRole('button', { name: 'Рассчитать' }));
  await screen.findByLabelText('Закупочная цена, CNY/м²');
}

function setField(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillCommercialTerms(): void {
  setField('Срок производства', '15–20 рабочих дней');
  setField('Срок доставки', 'Ориентировочно 4 недели после утверждения декора');
  setField('КП действительно до', '2026-08-20');
}

const pricedPreview = {
  sheetsCount: 359,
  areaM2: '2.7908',
  supplierPricePerM2: '80',
  purchasePricePerM2Cny: '80',
  clientPricePerM2: '24',
  pricePerSheet: '66.98',
  total: '24045.82',
  cnyUsdRate: '0.15',
  sellingCoefficient: '2',
};

describe('HplCalculatorWizard Step 8 quote commercial terms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    previewMutateAsync.mockResolvedValue({
      sheetsCount: 359,
      areaM2: '1001.8793',
      wastePercent: '0.19',
      sellingCoefficient: '2',
    });
    useAuthMock.mockReturnValue(auth(HEAD_PERMISSIONS, ['HEAD']));
  });

  it('shows HEAD commercial terms after the mechanical result', async () => {
    renderWizard();
    await openStep8();

    expect(screen.getByText('Коммерческие условия КП')).toBeInTheDocument();
    expect(screen.getByLabelText('Закупочная цена, CNY/м²')).toBeInTheDocument();
    expect(screen.getByLabelText('Срок производства')).toBeInTheDocument();
    expect(screen.getByLabelText('Срок доставки')).toBeInTheDocument();
    expect(screen.getByLabelText('КП действительно до')).toBeInTheDocument();
    expect(screen.getByText('Дата КП')).toBeInTheDocument();
    expect(screen.getByText(formatDate(new Date()))).toBeInTheDocument();
    expect(screen.queryByLabelText('Дата КП')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Примечание')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Условия поставки / примечание'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('1 CNY = 0.15 USD')).toBeInTheDocument();
    expect(screen.getByText('Коэффициент').closest('div')?.textContent).toContain(
      '2.0',
    );
    expect(screen.queryByLabelText('Курс')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Коэффициент')).not.toBeInTheDocument();
    expect(screen.getAllByText('1525×1830').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2.9 мм').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Запрошенная площадь').closest('div')?.textContent,
    ).toMatch(/000/);
    expect(screen.queryByRole('textbox', { name: 'Размер' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Толщина')).not.toBeInTheDocument();
    expect(screen.getByLabelText('КП действительно до')).toHaveValue(
      defaultQuoteValidUntilInput(),
    );
    expect(screen.getByText('359')).toBeInTheDocument();
    expect(
      screen.queryByText(PRICING_NOT_CONFIGURED_MESSAGE),
    ).not.toBeInTheDocument();
  });

  it('lets HEAD edit production, delivery and validity without a note or Quote date', async () => {
    renderWizard();
    await openStep8();
    fillCommercialTerms();

    expect(screen.getByLabelText('Срок производства')).toHaveValue(
      '15–20 рабочих дней',
    );
    expect(screen.getByLabelText('Срок доставки')).toHaveValue(
      'Ориентировочно 4 недели после утверждения декора',
    );
    expect(screen.getByLabelText('КП действительно до')).toHaveValue('2026-08-20');
    expect(screen.queryByLabelText('Дата КП')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Примечание')).not.toBeInTheDocument();
  });

  it('does not submit a priced calculation when the purchase price is empty', async () => {
    renderWizard();
    await openStep8();
    previewMutateAsync.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'Рассчитать стоимость' }));

    expect(previewMutateAsync).not.toHaveBeenCalled();
    expect(
      screen.getByText('Укажите закупочную цену, CNY/м²'),
    ).toBeInTheDocument();
  });

  it('keeps entered commercial terms after a successful priced calculation', async () => {
    renderWizard();
    await openStep8();
    fillCommercialTerms();
    previewMutateAsync.mockResolvedValueOnce(pricedPreview);

    await userEvent.type(screen.getByLabelText('Закупочная цена, CNY/м²'), '80');
    await userEvent.click(screen.getByRole('button', { name: 'Рассчитать стоимость' }));

    await waitFor(() => {
      expect(previewMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ purchasePricePerM2Cny: '80' }),
      );
    });
    expect(screen.getByLabelText('Закупочная цена, CNY/м²')).toHaveValue(80);
    expect(screen.getByLabelText('Срок производства')).toHaveValue(
      '15–20 рабочих дней',
    );
    expect(screen.getByLabelText('Срок доставки')).toHaveValue(
      'Ориентировочно 4 недели после утверждения декора',
    );
    expect(screen.getByLabelText('КП действительно до')).toHaveValue('2026-08-20');
    expect(screen.queryByLabelText('Дата КП')).not.toBeInTheDocument();
    expect(screen.getByText(formatDate(new Date()))).toBeInTheDocument();
    expect(screen.getByText('1 CNY = 0.15 USD')).toBeInTheDocument();
    expect(screen.getByText(/24 USD\/м²/)).toBeInTheDocument();
    expect(screen.getByText(/24 045,82/)).toBeInTheDocument();
  });

  it('converts a saved calculation with Step 8 commercial terms', async () => {
    createMutateAsync.mockResolvedValue({
      id: 'calc-1',
      status: 'draft',
      leadId: 'lead-1',
    });
    finalizeMutateAsync.mockResolvedValue({
      id: 'calc-1',
      status: 'finalized',
      leadId: 'lead-1',
    });
    convertMutateAsync.mockResolvedValue({ id: 'quote-1' });
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <HplCalculatorWizard
        leadId="lead-1"
        qualification={qualification}
        commercialSupplierId="sup-wuya"
        commercialQualityClassId="quality-economy"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    await openStep8();
    fillCommercialTerms();
    previewMutateAsync.mockResolvedValueOnce(pricedPreview);
    await userEvent.type(screen.getByLabelText('Закупочная цена, CNY/м²'), '80');
    await userEvent.click(screen.getByRole('button', { name: 'Рассчитать стоимость' }));
    await screen.findByText(/24 USD\/м²/);
    await userEvent.click(
      screen.getByRole('button', { name: 'Конвертировать в КП' }),
    );

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          items: [
            expect.objectContaining({ purchasePricePerM2Cny: '80' }),
          ],
        }),
      );
      expect(finalizeMutateAsync).toHaveBeenCalledWith('calc-1');
      expect(convertMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          calculationId: 'calc-1',
          productionTerms: '15–20 рабочих дней',
          deliveryTerms: 'Ориентировочно 4 недели после утверждения декора',
          validUntil: new Date(2026, 7, 20).toISOString(),
        }),
      );
      expect(convertMutateAsync.mock.calls[0][0]).not.toHaveProperty(
        'documentDate',
      );
      expect(convertMutateAsync.mock.calls[0][0]).not.toHaveProperty(
        'commercialNote',
      );
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
