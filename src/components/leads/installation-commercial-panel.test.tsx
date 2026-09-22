import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallationCommercialPanel } from './installation-commercial-panel';
import { I18nProvider } from '@/i18n/provider';
import { dictionaries } from '@/i18n/dictionaries';
import type { InstallationCommercialWorkspace } from '@/hooks/use-installation-commercial';

const useAuthMock = vi.fn();
const useInstallationCommercialMock = vi.fn();
const createMutate = vi.fn();
const patchMutate = vi.fn();
const submitMutate = vi.fn();
const approveMutate = vi.fn();
const repriceMutate = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/use-installation-commercial', async () => {
  const actual = await vi.importActual<
    typeof import('@/hooks/use-installation-commercial')
  >('@/hooks/use-installation-commercial');
  return {
    ...actual,
    useInstallationCommercial: () => useInstallationCommercialMock(),
    useCreateInstallationCommercial: () => ({
      mutateAsync: createMutate,
      isPending: false,
    }),
    usePatchInstallationCommercial: () => ({
      mutateAsync: patchMutate,
      isPending: false,
    }),
    useSubmitInstallationCommercial: () => ({
      mutateAsync: submitMutate,
      isPending: false,
    }),
    useApproveInstallationCommercial: () => ({
      mutateAsync: approveMutate,
      isPending: false,
    }),
    useRepriceInstallationCommercial: () => ({
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

function workspace(
  overrides: Partial<InstallationCommercialWorkspace> = {},
): InstallationCommercialWorkspace {
  return {
    applicable: true,
    canPrepare: true,
    canApprove: true,
    canReadCost: true,
    staleTechnicalBasis: false,
    technicalRevision: 1,
    quoteCreated: false,
    dealCreated: false,
    rates: [
      {
        id: 'rate-1',
        contractorId: 'crew-1',
        contractorName: 'Бригада А',
        workTypeId: 'wt-hpl',
        workTypeCode: 'hpl_install_m2',
        unit: 'M2',
        pricePerUnit: '12',
        currency: 'USD',
        isActive: true,
      },
    ],
    calculation: {
      id: 'com-1',
      leadId: 'lead-1',
      installationCalculationId: 'tech-1',
      installationCalculationRevision: 1,
      revision: 2,
      status: 'DRAFT',
      staleTechnicalBasis: false,
      currentTechnicalRevision: 1,
      costIncomplete: false,
      costByCurrency: [{ currency: 'USD', amount: '12000' }],
      proposedCustomerAmount: '15000',
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
          id: 'item-1',
          workTypeCode: 'hpl_install_m2',
          workTypeName: 'Монтаж HPL',
          unit: 'M2',
          quantity: '1000',
          quantitySource: 'MANUAL',
          selectedRateId: 'rate-1',
          contractorName: 'Бригада А',
          pricePerUnit: '12',
          currency: 'USD',
          lineCostTotal: '12000',
          priceStatus: 'CONFIGURED',
          sortOrder: 0,
        },
      ],
    },
    ...overrides,
  };
}

describe('InstallationCommercialPanel', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ user: { permissions: [] } });
    useInstallationCommercialMock.mockReturnValue({
      data: workspace(),
      isLoading: false,
      isError: false,
    });
  });

  it('shows HEAD approve and disables it when cost is incomplete', async () => {
    useInstallationCommercialMock.mockReturnValue({
      data: workspace({
        calculation: {
          ...workspace().calculation!,
          costIncomplete: true,
          status: 'READY_FOR_APPROVAL',
          items: [
            {
              ...workspace().calculation!.items[0],
              selectedRateId: null,
              priceStatus: 'NOT_CONFIGURED',
              lineCostTotal: null,
            },
          ],
        },
      }),
      isLoading: false,
      isError: false,
    });
    render(<InstallationCommercialPanel leadId="lead-1" />, { wrapper });
    expect(
      screen.getByRole('heading', { name: dictionaries.ru.installationPricing.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: dictionaries.ru.installationPricing.approve }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: dictionaries.ru.installationPricing.submit }),
    ).toBeDisabled();
    expect(
      screen.getByLabelText(dictionaries.ru.installationPricing.commercialNote),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: dictionaries.ru.common.save }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(dictionaries.ru.installationPricing.missingRate).length,
    ).toBeGreaterThan(0);
  });

  it('hides cost from the manager and shows only the approved customer amount', () => {
    useInstallationCommercialMock.mockReturnValue({
      data: workspace({
        canPrepare: false,
        canApprove: false,
        canReadCost: false,
        calculation: {
          ...workspace().calculation!,
          status: 'APPROVED',
          approvedCustomerAmount: '15000',
          approvedCurrency: 'USD',
          approverRoleSnapshot: 'HEAD',
          approvedAt: '2026-09-22T00:00:00.000Z',
        },
      }),
      isLoading: false,
      isError: false,
    });
    render(<InstallationCommercialPanel leadId="lead-1" />, { wrapper });
    expect(
      screen.getByText(dictionaries.ru.installationPricing.managerApproved),
    ).toBeInTheDocument();
    expect(screen.getByText(/15000/)).toBeInTheDocument();
    expect(
      screen.getByText(dictionaries.ru.installationPricing.managerHiddenCost),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: dictionaries.ru.installationPricing.approve,
      }),
    ).not.toBeInTheDocument();
  });

  it('shows a stale technical warning after volumes change', () => {
    useInstallationCommercialMock.mockReturnValue({
      data: workspace({
        staleTechnicalBasis: true,
        calculation: {
          ...workspace().calculation!,
          status: 'APPROVED',
          staleTechnicalBasis: true,
          approvedCustomerAmount: '15000',
          approvedCurrency: 'USD',
          approverRoleSnapshot: 'HEAD',
        },
      }),
      isLoading: false,
      isError: false,
    });
    render(<InstallationCommercialPanel leadId="lead-1" />, { wrapper });
    expect(
      screen.getByText(dictionaries.ru.installationPricing.staleTechnical),
    ).toBeInTheDocument();
    expect(
      screen.getByText(dictionaries.ru.installationPricing.approvedImmutable),
    ).toBeInTheDocument();
  });
});
