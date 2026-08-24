import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupplierPricingPanel } from './supplier-pricing-panel';

const useAuthMock = vi.fn();
const usePanelTypesMock = vi.fn();
const useSuppliersMock = vi.fn();
const useSupplierQualityClassesMock = vi.fn();
const useThicknessPricingMock = vi.fn();
const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/use-panels', () => ({
  usePanelTypes: () => usePanelTypesMock(),
  useSuppliers: () => useSuppliersMock(),
  useSupplierQualityClasses: (...args: unknown[]) =>
    useSupplierQualityClassesMock(...args),
}));

vi.mock('@/hooks/use-panel-pricing', () => ({
  PANEL_PRICING_MANAGE_PERMISSION: 'panel_pricing:manage',
  useThicknessPricing: () => useThicknessPricingMock(),
  useCreateThicknessPricing: () => ({
    mutateAsync: createMutateAsync,
    isPending: false,
  }),
  useUpdateThicknessPricing: () => ({
    mutateAsync: updateMutateAsync,
    isPending: false,
  }),
}));

function auth(permissions: string[]) {
  return {
    user: {
      id: 'user-1',
      email: 'user@hpl.local',
      roles: [],
      permissions,
    },
    hasPermission: (slug: string) => permissions.includes(slug),
    isInitialized: true,
    login: vi.fn(),
    logout: vi.fn(),
  };
}

const furnitureType = {
  id: 'type-furniture',
  code: 'furniture',
  displayNameRu: 'Мебельный',
};
const interiorType = {
  id: 'type-interior',
  code: 'interior',
  displayNameRu: 'Интерьерный',
};
const wuya = { id: 'sup-wuya', code: 'wuya' as const, name: 'Wuya' };
const economy = { id: 'q-economy', code: 'economy', nameRu: 'Эконом' };

describe('SupplierPricingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePanelTypesMock.mockReturnValue({
      data: [furnitureType, interiorType],
      isLoading: false,
    });
    useSuppliersMock.mockReturnValue({
      data: [wuya],
      isLoading: false,
    });
    useSupplierQualityClassesMock.mockReturnValue({
      data: [economy],
      isLoading: false,
    });
    useThicknessPricingMock.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('shows supplier pricing management UI for HEAD', () => {
    useAuthMock.mockReturnValue(auth(['panel_pricing:manage']));
    render(<SupplierPricingPanel />);

    expect(screen.getByText('Закупочные цены поставщиков')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Сохранить цену' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Закупочная цена, CNY')).toBeInTheDocument();
  });

  it('does not show the section to MANAGER', () => {
    useAuthMock.mockReturnValue(
      auth(['panel_catalog:read', 'panel_catalog:manage']),
    );
    const { container } = render(<SupplierPricingPanel />);
    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByText('Закупочные цены поставщиков'),
    ).not.toBeInTheDocument();
  });

  it('renders wuya as Вуя on existing rows, not Буя', () => {
    useAuthMock.mockReturnValue(auth(['panel_pricing:manage']));
    useThicknessPricingMock.mockReturnValue({
      data: [
        {
          id: 'price-1',
          supplierId: 'sup-wuya',
          qualityClassId: 'q-economy',
          thicknessMm: '2.9',
          basePricePerM2: '80',
          currencyCode: 'CNY',
          isActive: true,
          supplier: { id: 'sup-wuya', code: 'wuya', name: 'Буя' },
          qualityClass: { id: 'q-economy', code: 'economy', nameRu: 'Эконом' },
          panelTypes: [furnitureType],
        },
      ],
      isLoading: false,
    });

    render(<SupplierPricingPanel />);

    expect(screen.getAllByText('Вуя').length).toBeGreaterThan(0);
    expect(screen.queryByText('Буя')).not.toBeInTheDocument();
    expect(screen.getAllByText('Эконом').length).toBeGreaterThan(0);
    expect(screen.getByText('2.9 мм')).toBeInTheDocument();
    expect(screen.getByText('80 CNY')).toBeInTheDocument();
    expect(screen.getAllByText('Мебельный').length).toBeGreaterThan(0);
  });

  it('constrains quality options to mapped lines and supports furniture decimals without 16 mm', async () => {
    useAuthMock.mockReturnValue(auth(['panel_pricing:manage']));
    const user = userEvent.setup();
    render(<SupplierPricingPanel />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Тип HPL' }),
      'type-furniture',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Поставщик' }),
      'sup-wuya',
    );

    expect(useSupplierQualityClassesMock).toHaveBeenCalledWith(
      'wuya',
      'furniture',
    );
    expect(screen.getByRole('option', { name: 'Эконом' })).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Премиум' }),
    ).not.toBeInTheDocument();

    const thickness = screen.getByLabelText('Толщина, мм');
    expect(thickness).toHaveAttribute('type', 'number');
    expect(thickness).toHaveAttribute('min', '0.5');
    expect(thickness).toHaveAttribute('max', '2.9');
    expect(
      screen.queryByRole('option', { name: '16 мм' }),
    ).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Тип HPL' }),
      'type-interior',
    );
    expect(screen.getByRole('option', { name: '1 мм' })).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '16 мм' }),
    ).not.toBeInTheDocument();
  });

  it('does not submit a non-positive CNY price', async () => {
    useAuthMock.mockReturnValue(auth(['panel_pricing:manage']));
    const user = userEvent.setup();
    render(<SupplierPricingPanel />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Тип HPL' }),
      'type-furniture',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Поставщик' }),
      'sup-wuya',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Линейка' }),
      'q-economy',
    );
    await user.type(screen.getByLabelText('Толщина, мм'), '2.9');
    await user.type(screen.getByLabelText('Закупочная цена, CNY'), '0');

    expect(
      screen.getByRole('button', { name: 'Сохранить цену' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Сохранить цену' }));
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('posts the backend payload for a valid CNY price and shows missing-price state first', async () => {
    useAuthMock.mockReturnValue(auth(['panel_pricing:manage']));
    const user = userEvent.setup();
    render(<SupplierPricingPanel />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Тип HPL' }),
      'type-furniture',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Поставщик' }),
      'sup-wuya',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Линейка' }),
      'q-economy',
    );
    await user.type(screen.getByLabelText('Толщина, мм'), '2.9');

    expect(screen.getAllByText(/Цена не настроена/).length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText('Закупочная цена, CNY'), '80.5');
    await user.click(screen.getByRole('button', { name: 'Сохранить цену' }));

    expect(createMutateAsync).toHaveBeenCalledWith({
      panelTypeId: 'type-furniture',
      supplierId: 'sup-wuya',
      qualityClassId: 'q-economy',
      thicknessMm: '2.9',
      basePricePerM2: '80.5',
    });
  });
});
