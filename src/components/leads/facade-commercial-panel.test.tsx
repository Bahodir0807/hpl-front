import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FacadeCommercialPanel } from './facade-commercial-panel';
import { I18nProvider } from '@/i18n/provider';
import { dictionaries } from '@/i18n/dictionaries';
import type { FacadeCommercialWorkspace } from '@/hooks/use-facade-commercial';

const useAuthMock = vi.fn();
const useFacadeCommercialMock = vi.fn();
const createMutate = vi.fn();
const patchMutate = vi.fn();
const submitMutate = vi.fn();
const approveMutate = vi.fn();
const repriceMutate = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/use-facade-commercial', async () => {
  const actual = await vi.importActual<
    typeof import('@/hooks/use-facade-commercial')
  >('@/hooks/use-facade-commercial');
  return {
    ...actual,
    useFacadeCommercial: () => useFacadeCommercialMock(),
    useCreateFacadeCommercial: () => ({
      mutateAsync: createMutate,
      isPending: false,
    }),
    usePatchFacadeCommercial: () => ({
      mutateAsync: patchMutate,
      isPending: false,
    }),
    useSubmitFacadeCommercial: () => ({
      mutateAsync: submitMutate,
      isPending: false,
    }),
    useApproveFacadeCommercial: () => ({
      mutateAsync: approveMutate,
      isPending: false,
    }),
    useRepriceFacadeCommercial: () => ({
      mutateAsync: repriceMutate,
      isPending: false,
    }),
  };
});

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

const HEAD_PERMS = [
  'leads:read',
  'leads:read_all',
  'facade_pricing:read_purchase',
  'facade_pricing:prepare',
  'facade_pricing:approve',
];
const DIRECTOR_PERMS = [...HEAD_PERMS];
const ENGINEER_PERMS = [
  'leads:read',
  'engineering:read',
  'engineering:update_technical',
];
const MANAGER_PERMS = ['leads:read', 'leads:update'];

function workspace(
  overrides: Partial<FacadeCommercialWorkspace> = {},
): FacadeCommercialWorkspace {
  return {
    canPrepare: true,
    canApprove: true,
    canReadPurchase: true,
    staleTechnicalBasis: false,
    technicalRevision: 1,
    snapshotTechnicalRevision: 1,
    quoteCreated: false,
    dealCreated: false,
    offers: [
      {
        id: 'offer-active',
        materialId: 'mat-1',
        materialCode: 'membrane',
        supplierId: 'sup-1',
        supplierName: 'QA Supplier',
        purchasePrice: '4.5',
        currency: 'USD',
        unit: 'M2',
        isActive: true,
        validFrom: '2026-01-01T00:00:00.000Z',
        validTo: null,
        availability: null,
        leadTimeDays: null,
      },
      {
        id: 'offer-inactive',
        materialId: 'mat-1',
        materialCode: 'membrane',
        supplierId: 'sup-2',
        supplierName: 'Old Supplier',
        purchasePrice: '3',
        currency: 'USD',
        unit: 'M2',
        isActive: false,
        validFrom: '2026-01-01T00:00:00.000Z',
        validTo: null,
        availability: null,
        leadTimeDays: null,
      },
    ],
    calculation: {
      id: 'comm-1',
      leadId: 'lead-1',
      facadeCalculationId: 'tech-1',
      facadeCalculationRevision: 1,
      revision: 2,
      status: 'READY_FOR_APPROVAL',
      staleTechnicalBasis: false,
      currentTechnicalRevision: 1,
      claddingAreaM2: '1000',
      configCode: 'HPL_FACADE_BASE_1220_3050',
      normSetCode: 'HPL_FACADE_BASE_1220_3050_V1',
      procurementIncomplete: false,
      procurementByCurrency: [{ currency: 'USD', amount: '5220' }],
      fxSnapshots: [],
      proposedCustomerAmount: '8000',
      proposedCurrency: 'USD',
      approvedCustomerAmount: null,
      approvedCurrency: null,
      approvedById: null,
      approvedAt: null,
      approverRoleSnapshot: null,
      commercialNote: null,
      quoteCreated: false,
      dealCreated: false,
      items: [
        {
          id: 'item-hpl',
          materialCode: 'hpl_panel_1220_3050',
          materialName: 'HPL-панель 1220×3050 мм',
          category: 'HPL',
          unit: 'M2',
          finalQty: '1060',
          excludedFromSubsystemCommercialCost: true,
          selectedOfferId: null,
          offerSnapshot: null,
          purchasePrice: null,
          purchaseCurrency: null,
          linePurchaseTotal: null,
          priceStatus: 'EXCLUDED',
          fxRate: null,
          fxFromCurrency: null,
          fxToCurrency: null,
          sortOrder: 1,
        },
        {
          id: 'item-mem',
          materialCode: 'membrane',
          materialName: 'Мембрана',
          category: 'MEMBRANE',
          unit: 'M2',
          finalQty: '1160',
          excludedFromSubsystemCommercialCost: false,
          selectedOfferId: 'offer-active',
          offerSnapshot: null,
          purchasePrice: '4.5',
          purchaseCurrency: 'USD',
          linePurchaseTotal: '5220',
          priceStatus: 'CONFIGURED',
          fxRate: null,
          fxFromCurrency: null,
          fxToCurrency: null,
          sortOrder: 2,
        },
      ],
    },
    ...overrides,
  };
}

describe('FacadeCommercialPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFacadeCommercialMock.mockReturnValue({
      data: workspace(),
      isLoading: false,
      isError: false,
    });
  });

  it('lets HEAD approve subsystem cost', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({
      user: { permissions: HEAD_PERMS, roles: ['HEAD'] },
    });
    render(<FacadeCommercialPanel leadId="lead-1" />, { wrapper });
    expect(
      screen.getByRole('heading', { name: dictionaries.ru.facadePricing.title }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: dictionaries.ru.facadePricing.approve }),
    );
    expect(approveMutate).toHaveBeenCalledWith(2);
  });

  it('lets DIRECTOR approve without showing HPL quote controls', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({
      user: { permissions: DIRECTOR_PERMS, roles: ['DIRECTOR'] },
    });
    render(<FacadeCommercialPanel leadId="lead-1" />, { wrapper });
    await user.click(
      screen.getByRole('button', { name: dictionaries.ru.facadePricing.approve }),
    );
    expect(approveMutate).toHaveBeenCalled();
    expect(screen.queryByText(/Quote/i)).not.toBeInTheDocument();
  });

  it('hides approval controls from ENGINEER', () => {
    useAuthMock.mockReturnValue({
      user: { permissions: ENGINEER_PERMS, roles: ['ENGINEER'] },
    });
    const { container } = render(<FacadeCommercialPanel leadId="lead-1" />, {
      wrapper,
    });
    expect(container).toBeEmptyDOMElement();
    expect(approveMutate).not.toHaveBeenCalled();
  });

  it('does not let MANAGER approve and hides procurement before approval', () => {
    useAuthMock.mockReturnValue({
      user: { permissions: MANAGER_PERMS, roles: ['MANAGER'] },
    });
    useFacadeCommercialMock.mockReturnValue({
      data: workspace({
        canPrepare: false,
        canApprove: false,
        canReadPurchase: false,
        calculation: {
          ...workspace().calculation!,
          status: 'DRAFT',
          approvedCustomerAmount: null,
        },
      }),
      isLoading: false,
      isError: false,
    });
    render(<FacadeCommercialPanel leadId="lead-1" />, { wrapper });
    expect(
      screen.queryByRole('button', {
        name: dictionaries.ru.facadePricing.approve,
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('5220')).not.toBeInTheDocument();
  });

  it('shows MANAGER the approved customer amount only', () => {
    useAuthMock.mockReturnValue({
      user: { permissions: MANAGER_PERMS, roles: ['MANAGER'] },
    });
    useFacadeCommercialMock.mockReturnValue({
      data: workspace({
        canPrepare: false,
        canApprove: false,
        canReadPurchase: false,
        calculation: {
          ...workspace().calculation!,
          status: 'APPROVED',
          approvedCustomerAmount: '8000',
          approvedCurrency: 'USD',
          approverRoleSnapshot: 'HEAD',
        },
      }),
      isLoading: false,
      isError: false,
    });
    render(<FacadeCommercialPanel leadId="lead-1" />, { wrapper });
    expect(screen.getByText(/8000/)).toBeInTheDocument();
    expect(
      screen.getByText(dictionaries.ru.facadePricing.managerHiddenProcurement),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: dictionaries.ru.facadePricing.approve,
      }),
    ).not.toBeInTheDocument();
  });

  it('shows stale technical revision warning and approved immutable state', () => {
    useAuthMock.mockReturnValue({
      user: { permissions: HEAD_PERMS, roles: ['HEAD'] },
    });
    useFacadeCommercialMock.mockReturnValue({
      data: workspace({
        staleTechnicalBasis: true,
        calculation: {
          ...workspace().calculation!,
          status: 'APPROVED',
          staleTechnicalBasis: true,
          currentTechnicalRevision: 2,
          approvedCustomerAmount: '8000',
          approvedCurrency: 'USD',
          approverRoleSnapshot: 'HEAD',
        },
      }),
      isLoading: false,
      isError: false,
    });
    render(<FacadeCommercialPanel leadId="lead-1" />, { wrapper });
    expect(
      screen.getByText(dictionaries.ru.facadePricing.staleTechnical),
    ).toBeInTheDocument();
    expect(
      screen.getByText(dictionaries.ru.facadePricing.approvedImmutable),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: dictionaries.ru.facadePricing.approve,
      }),
    ).not.toBeInTheDocument();
  });

  it('renders missing purchase price and inactive offer option', () => {
    useAuthMock.mockReturnValue({
      user: { permissions: HEAD_PERMS, roles: ['HEAD'] },
    });
    const data = workspace();
    data.calculation = {
      ...data.calculation!,
      status: 'DRAFT',
      procurementIncomplete: true,
      items: data.calculation!.items.map((item) =>
        item.materialCode === 'membrane'
          ? {
              ...item,
              selectedOfferId: null,
              priceStatus: 'NOT_CONFIGURED',
              purchasePrice: null,
              linePurchaseTotal: null,
            }
          : item,
      ),
    };
    useFacadeCommercialMock.mockReturnValue({
      data,
      isLoading: false,
      isError: false,
    });
    render(<FacadeCommercialPanel leadId="lead-1" />, { wrapper });
    expect(
      screen.getAllByText(dictionaries.ru.facadePricing.missingPrice).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(dictionaries.ru.facadePricing.excludedHpl).length,
    ).toBeGreaterThan(0);
    const inactive = screen.getAllByRole('option', {
      name: /Old Supplier/,
    })[0] as HTMLOptionElement;
    expect(inactive.disabled).toBe(true);
    expect(
      screen.getByRole('button', { name: dictionaries.ru.facadePricing.submit }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: dictionaries.ru.facadePricing.approve }),
    ).toBeDisabled();
  });

  it('restores saved offer selections after a calculation revision update', () => {
    useAuthMock.mockReturnValue({
      user: { permissions: HEAD_PERMS, roles: ['HEAD'] },
    });
    const draft = workspace();
    draft.calculation = {
      ...draft.calculation!,
      status: 'DRAFT',
      revision: 1,
      items: draft.calculation!.items.map((item) =>
        item.materialCode === 'membrane'
          ? {
              ...item,
              id: 'item-mem-old',
              selectedOfferId: null,
              priceStatus: 'NOT_CONFIGURED',
            }
          : item,
      ),
    };
    useFacadeCommercialMock.mockReturnValue({
      data: draft,
      isLoading: false,
      isError: false,
    });
    const { rerender } = render(<FacadeCommercialPanel leadId="lead-1" />, {
      wrapper,
    });
    expect(
      screen.getAllByRole('combobox', {
        name: dictionaries.ru.facadePricing.selectOffer,
      })[0],
    ).toHaveValue('');

    const saved = workspace();
    saved.calculation = {
      ...saved.calculation!,
      status: 'DRAFT',
      revision: 2,
      items: saved.calculation!.items.map((item) =>
        item.materialCode === 'membrane'
          ? { ...item, id: 'item-mem-new', selectedOfferId: 'offer-active' }
          : item,
      ),
    };
    useFacadeCommercialMock.mockReturnValue({
      data: saved,
      isLoading: false,
      isError: false,
    });
    rerender(<FacadeCommercialPanel leadId="lead-1" />);
    expect(
      screen.getAllByRole('combobox', {
        name: dictionaries.ru.facadePricing.selectOffer,
      })[0],
    ).toHaveValue('offer-active');
  });

  it('localizes the commercial block in EN and UZ', () => {
    useAuthMock.mockReturnValue({
      user: { permissions: HEAD_PERMS, roles: ['HEAD'] },
    });
    const { unmount } = render(<FacadeCommercialPanel leadId="lead-1" />, {
      wrapper: function EnWrapper({ children }: { children: ReactNode }) {
        const client = new QueryClient({
          defaultOptions: { queries: { retry: false } },
        });
        return (
          <I18nProvider initialLocale="en">
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
          </I18nProvider>
        );
      },
    });
    expect(
      screen.getByRole('heading', { name: dictionaries.en.facadePricing.title }),
    ).toBeInTheDocument();
    unmount();
    render(<FacadeCommercialPanel leadId="lead-1" />, {
      wrapper: function UzWrapper({ children }: { children: ReactNode }) {
        const client = new QueryClient({
          defaultOptions: { queries: { retry: false } },
        });
        return (
          <I18nProvider initialLocale="uz">
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
          </I18nProvider>
        );
      },
    });
    expect(
      screen.getByRole('heading', { name: dictionaries.uz.facadePricing.title }),
    ).toBeInTheDocument();
  });
});
