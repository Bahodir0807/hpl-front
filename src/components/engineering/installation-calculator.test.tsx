import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallationCalculator } from './installation-calculator';
import type { InstallationWorkspace } from '@/hooks/use-installation-calculation';
import { I18nProvider } from '@/i18n/provider';
import { dictionaries } from '@/i18n/dictionaries';
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
  overrides: Partial<InstallationWorkspace> = {},
): InstallationWorkspace {
  return {
    applicable: true,
    reason: null,
    canEdit: true,
    assignmentId: 'assign-1',
    suggestedArea: { value: '1000', source: 'HPL_QUALIFICATION', ambiguous: false },
    approvedNormAvailable: false,
    workTypes: [
      {
        id: 'wt-hpl',
        code: 'hpl_install_m2',
        nameRu: 'Монтаж HPL',
        nameEn: 'HPL install',
        nameUz: 'HPL montaj',
        description: null,
        unit: 'M2',
        category: 'CLADDING',
      },
    ],
    calculation: null,
    quoteCreated: false,
    dealCreated: false,
    ...overrides,
  };
}

describe('InstallationCalculator', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      user: { permissions: ['installation:update_technical'] },
    });
    vi.mocked(apiClient.get).mockResolvedValue({ data: workspace() });
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: {
        id: 'calc-1',
        leadId: 'lead-1',
        assignmentId: 'assign-1',
        engineerId: 'engineer-1',
        status: 'DRAFT',
        revision: 1,
        note: null,
        ready: false,
        items: [
          {
            id: 'item-1',
            workTypeId: 'wt-hpl',
            workTypeCode: 'hpl_install_m2',
            workTypeName: 'Монтаж HPL',
            unit: 'M2',
            quantity: '1000',
            quantitySource: 'MANUAL',
            note: null,
            sortOrder: 0,
          },
        ],
      },
    });
  });

  it('lets an engineer add a work type and save a quantity on a phone-sized card layout', async () => {
    const user = userEvent.setup();
    const { container } = render(<InstallationCalculator leadId="lead-1" />, {
      wrapper,
    });
    expect(
      await screen.findByRole('heading', {
        name: dictionaries.ru.engineering.installationTitle,
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', {
        name: dictionaries.ru.engineering.installationAddWork,
      }),
    );
    const quantities = screen.getAllByLabelText(
      dictionaries.ru.engineering.installationQuantity,
    );
    await user.type(quantities[0], '1000');
    await user.click(
      screen.getByRole('button', {
        name: dictionaries.ru.engineering.installationSaveDraft,
      }),
    );
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/engineering/leads/lead-1/installation',
      expect.objectContaining({
        items: [
          expect.objectContaining({
            workTypeId: 'wt-hpl',
            quantity: '1000',
          }),
        ],
      }),
    );
    expect(container.querySelector('table')).toBeNull();
  });

  it('hides the calculator actions when installation is not requested', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: workspace({
        applicable: false,
        reason: 'INSTALLATION_NOT_REQUESTED',
      }),
    });
    render(<InstallationCalculator leadId="lead-1" />, { wrapper });
    expect(
      await screen.findByText(dictionaries.ru.engineering.installationNotRequested),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: dictionaries.ru.engineering.installationAddWork,
      }),
    ).not.toBeInTheDocument();
  });
});
