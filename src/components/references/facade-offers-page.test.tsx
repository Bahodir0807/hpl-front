import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FacadeOffersPage } from './facade-offers-page';
import { I18nProvider } from '@/i18n/provider';
import { dictionaries } from '@/i18n/dictionaries';

const useAuthMock = vi.fn();
const useFacadeOffersMock = vi.fn();
const createMutate = vi.fn();
const updateMutate = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/use-facade-offers', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-facade-offers')>(
    '@/hooks/use-facade-offers',
  );
  return {
    ...actual,
    useFacadeOffers: () => useFacadeOffersMock(),
    useCreateFacadeOffer: () => ({
      mutateAsync: createMutate,
      isPending: false,
    }),
    useUpdateFacadeOffer: () => ({
      mutateAsync: updateMutate,
      isPending: false,
    }),
  };
});

vi.mock('@/lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <I18nProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </I18nProvider>
  );
}

const catalog = {
  items: [
    {
      id: 'offer-1',
      materialId: 'mat-1',
      supplierId: 'sup-1',
      purchasePrice: '12.5',
      currency: 'USD',
      unit: 'PCS',
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: null,
      isActive: true,
      availability: null,
      leadTimeDays: 14,
      supplierSku: null,
      note: null,
      material: {
        code: 'bracket_50_100_80_t2',
        nameRu: 'Кронштейн 50×100×80, t=2,0 мм',
        nameEn: 'Bracket 50×100×80, t=2.0 mm',
        nameUz: 'Kronshteyn 50×100×80, t=2,0 mm',
        category: 'SUBSYSTEM',
        unit: 'PCS',
      },
      supplier: { code: 'qa', name: 'QA Supplier' },
    },
    {
      id: 'offer-2',
      materialId: 'mat-1',
      supplierId: 'sup-2',
      purchasePrice: '90',
      currency: 'CNY',
      unit: 'PCS',
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: null,
      isActive: false,
      availability: null,
      leadTimeDays: null,
      supplierSku: null,
      note: null,
      material: {
        code: 'bracket_50_100_80_t2',
        nameRu: 'Кронштейн 50×100×80, t=2,0 мм',
        nameEn: 'Bracket 50×100×80, t=2.0 mm',
        nameUz: 'Kronshteyn 50×100×80, t=2,0 mm',
        category: 'SUBSYSTEM',
        unit: 'PCS',
      },
      supplier: { code: 'alt', name: 'Alt Supplier' },
    },
  ],
  materials: [
    {
      id: 'mat-1',
      code: 'bracket_50_100_80_t2',
      nameRu: 'Кронштейн 50×100×80, t=2,0 мм',
      nameEn: 'Bracket 50×100×80, t=2.0 mm',
      nameUz: 'Kronshteyn 50×100×80, t=2,0 mm',
      category: 'SUBSYSTEM',
      unit: 'PCS',
    },
  ],
  suppliers: [{ id: 'sup-1', code: 'qa', name: 'QA Supplier' }],
};

describe('FacadeOffersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFacadeOffersMock.mockReturnValue({
      data: catalog,
      isLoading: false,
      isError: false,
    });
  });

  it('hides offers from users without purchase-price permission', () => {
    useAuthMock.mockReturnValue({
      user: { permissions: ['leads:read'] },
    });
    render(<FacadeOffersPage />, { wrapper });
    expect(
      screen.getByText(dictionaries.ru.facadePricing.noAccess),
    ).toBeInTheDocument();
    expect(screen.queryByText('QA Supplier')).not.toBeInTheDocument();
  });

  it('lists multiple supplier offers with currencies and inactive status', () => {
    useAuthMock.mockReturnValue({
      user: {
        permissions: [
          'facade_pricing:read_purchase',
          'facade_pricing:manage_offers',
        ],
      },
    });
    render(<FacadeOffersPage />, { wrapper });
    expect(screen.getAllByText('QA Supplier').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alt Supplier').length).toBeGreaterThan(0);
    expect(screen.getAllByText('12.5').length).toBeGreaterThan(0);
    expect(screen.getAllByText('USD').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CNY').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(dictionaries.ru.facadePricing.inactive).length,
    ).toBeGreaterThan(0);
  });

  it('lets an authorized user open the create form', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({
      user: {
        permissions: [
          'facade_pricing:read_purchase',
          'facade_pricing:manage_offers',
        ],
      },
    });
    render(<FacadeOffersPage />, { wrapper });
    await user.click(
      screen.getByRole('button', {
        name: dictionaries.ru.facadePricing.createOffer,
      }),
    );
    expect(
      screen.getByLabelText(dictionaries.ru.facadePricing.purchasePrice),
    ).toBeInTheDocument();
  });

  it('does not send materialId when saving an edited offer', async () => {
    const user = userEvent.setup();
    updateMutate.mockResolvedValue({});
    useAuthMock.mockReturnValue({
      user: {
        permissions: [
          'facade_pricing:read_purchase',
          'facade_pricing:manage_offers',
        ],
      },
    });
    render(<FacadeOffersPage />, { wrapper });
    await user.click(
      screen.getAllByRole('button', { name: dictionaries.ru.common.edit })[0],
    );
    const price = screen.getByLabelText(dictionaries.ru.facadePricing.purchasePrice);
    await user.clear(price);
    await user.type(price, '12.75');
    await user.click(
      screen.getByRole('button', { name: dictionaries.ru.common.save }),
    );
    expect(updateMutate).toHaveBeenCalledTimes(1);
    const payload = updateMutate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      id: 'offer-1',
      purchasePrice: '12.75',
      supplierId: 'sup-1',
    });
    expect(payload).not.toHaveProperty('materialId');
  });
});
