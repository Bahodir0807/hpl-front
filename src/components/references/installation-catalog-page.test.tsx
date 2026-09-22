import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallationCatalogPage } from './installation-catalog-page';
import { I18nProvider } from '@/i18n/provider';
import { dictionaries } from '@/i18n/dictionaries';

const useAuthMock = vi.fn();
const updateRateMutate = vi.fn();
const ratesQuery = {
  data: {
    items: [
      {
        id: 'rate-1',
        contractorId: 'crew-1',
        contractorName: 'QA crew',
        workTypeId: 'wt-1',
        workTypeCode: 'acc_cladding_m2',
        workTypeName: 'Монтаж облицовки',
        unit: 'M2',
        pricePerUnit: '15',
        currency: 'USD',
        validFrom: '2026-09-22T00:00:00.000Z',
        validTo: '2027-09-22T00:00:00.000Z',
        isActive: true,
        note: null,
      },
    ],
  },
  isLoading: false,
  isError: false,
};

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/use-installation-catalog', () => ({
  useInstallationWorkTypes: () => ({
    data: { items: [] },
    isLoading: false,
    isError: false,
  }),
  useInstallationContractors: () => ({
    data: { items: [] },
    isLoading: false,
    isError: false,
  }),
  useInstallationRates: () => ratesQuery,
  useCreateInstallationWorkType: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateInstallationWorkType: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateInstallationContractor: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateInstallationContractor: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateInstallationRate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateInstallationRate: () => ({ mutateAsync: updateRateMutate, isPending: false }),
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

describe('InstallationCatalogPage', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ user: { permissions: [] } });
    updateRateMutate.mockReset();
    updateRateMutate.mockResolvedValue({});
  });

  it('hides the catalog without manage_contractors', () => {
    render(<InstallationCatalogPage />, { wrapper });
    expect(
      screen.getByText(dictionaries.ru.installationPricing.noAccess),
    ).toBeInTheDocument();
  });

  it('shows crew and work-type forms for HEAD', () => {
    useAuthMock.mockReturnValue({
      user: { permissions: ['installation_pricing:manage_contractors'] },
    });
    render(<InstallationCatalogPage />, { wrapper });
    expect(
      screen.getByRole('heading', {
        name: dictionaries.ru.installationPricing.catalogTitle,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: dictionaries.ru.installationPricing.addWorkType,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: dictionaries.ru.installationPricing.addContractor,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(dictionaries.ru.installationPricing.validFrom),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(dictionaries.ru.installationPricing.validTo),
    ).toBeInTheDocument();
    expect(
      screen.getAllByLabelText(dictionaries.ru.installationPricing.unit).length,
    ).toBeGreaterThan(0);
  });

  it('persists an inline rate edit on blur without relying on defaultValue', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({
      user: { permissions: ['installation_pricing:manage_contractors'] },
    });
    render(<InstallationCatalogPage />, { wrapper });
    const price = screen.getByLabelText(
      `${dictionaries.ru.installationPricing.pricePerUnit} Монтаж облицовки`,
    );
    await user.clear(price);
    await user.type(price, '16');
    await user.tab();
    expect(updateRateMutate).toHaveBeenCalledWith({
      id: 'rate-1',
      pricePerUnit: '16',
    });
  });
});
