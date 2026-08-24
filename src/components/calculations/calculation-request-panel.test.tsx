import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createApiErrorFromPayload,
  PRICING_NOT_CONFIGURED_MESSAGE,
} from '@/lib/hpl-errors';
import { CalculationRequestPanel } from './calculation-request-panel';

const useAuthMock = vi.fn();
const convertMutate = vi.fn();
const requestFixture: {
  id: string;
  status: string;
  quotes: Array<{ id: string }>;
  createdAt: string;
  updatedAt: string;
  notes: string;
  createdBy: { firstName: string; lastName: string };
  client: { id: string; name: string };
  calculations: unknown[];
} = {
  id: 'req-1',
  status: 'submitted',
  quotes: [],
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
  notes: 'Нужен CIP',
  createdBy: { firstName: 'Иван', lastName: 'Менеджер' },
  client: { id: 'client-1', name: 'ООО Фасад' },
  calculations: [
    {
      id: 'calc-1',
      title: 'Расчёт №1',
      items: [
        {
          panelTypeId: 'type-1',
          supplierId: 'sup-1',
          qualityClassId: 'q-1',
          thicknessMm: 8,
          requiredAreaM2: '20',
        },
      ],
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-20T10:00:00.000Z',
    },
  ],
};

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/use-calculation-requests', () => ({
  useCalculationRequests: () => ({
    data: [requestFixture],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateCalculationRequest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCalculationRequest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSubmitCalculationRequest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useConvertCalculationRequestToQuote: () => ({
    mutateAsync: convertMutate,
    isPending: false,
  }),
}));

vi.mock('@/hooks/use-panels', () => ({
  useSuppliers: () => ({
    data: [
      { id: 'sup-1', code: 'wuya', name: 'Wuya', deliveryDays: 10 },
      { id: 'sup-2', code: 'tianran', name: 'Tianran', deliveryDays: 14 },
    ],
    isError: false,
  }),
  usePanelTypes: () => ({ data: [], isError: false }),
  usePanelSizes: () => ({ data: [], isError: false }),
  usePanelColors: () => ({ data: [], isError: false }),
  unwrapSupplierQualityClasses: () => [
    { id: 'q-1', code: 'medium', nameRu: 'Медиум' },
  ],
}));

vi.mock('@/hooks/use-lead-workspace', () => ({
  useLeadWorkspace: () => ({
    data: { catalog: { suppliers: [] } },
    isError: false,
  }),
}));

describe('CalculationRequestPanel permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestFixture.status = 'submitted';
    requestFixture.quotes = [];
  });

  it('lets HEAD convert a submitted request and hides manager convert', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'head-1',
        permissions: ['calculations:read', 'quotes:approve'],
      },
    });
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<CalculationRequestPanel leadId="lead-1" />);
    expect(screen.getByText('Отправлен руководителю')).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText('Поставщик для расчёта req-1'),
      'sup-1',
    );
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Создать черновик КП' })[0],
    );
    expect(convertMutate).toHaveBeenCalledWith({
      id: 'req-1',
      supplierId: 'sup-1',
    });
  });

  it('shows HEAD supplier selection and disables convert until it is selected', () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'head-1',
        permissions: ['calculations:read', 'quotes:approve'],
      },
    });

    render(<CalculationRequestPanel leadId="lead-1" />);
    expect(
      screen.getByLabelText('Поставщик для расчёта req-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Создать черновик КП' }),
    ).toBeDisabled();
  });

  it('keeps the screen open, shows supplier error and permits another selection', async () => {
    convertMutate.mockRejectedValueOnce(
      createApiErrorFromPayload({ code: 'QUOTE_SUPPLIER_REQUIRED' }),
    );
    useAuthMock.mockReturnValue({
      user: {
        id: 'head-1',
        permissions: ['calculations:read', 'quotes:approve'],
      },
    });
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<CalculationRequestPanel leadId="lead-1" />);

    const supplier = screen.getByLabelText('Поставщик для расчёта req-1');
    await userEvent.selectOptions(supplier, 'sup-1');
    await userEvent.click(
      screen.getByRole('button', { name: 'Создать черновик КП' }),
    );
    expect(screen.getByText('Выберите поставщика для расчёта')).toBeInTheDocument();
    expect(supplier).toHaveAttribute('aria-invalid', 'true');

    await userEvent.selectOptions(supplier, 'sup-2');
    expect(supplier).toHaveValue('sup-2');
    expect(
      screen.queryByText('Выберите поставщика для расчёта'),
    ).not.toBeInTheDocument();
  });

  it('shows a pricing error inline and lets HEAD switch supplier', async () => {
    convertMutate.mockRejectedValueOnce(
      createApiErrorFromPayload({ code: 'PRICING_NOT_CONFIGURED' }),
    );
    useAuthMock.mockReturnValue({
      user: {
        id: 'head-1',
        permissions: ['calculations:read', 'quotes:approve'],
      },
    });
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<CalculationRequestPanel leadId="lead-1" />);

    const supplier = screen.getByLabelText('Поставщик для расчёта req-1');
    await userEvent.selectOptions(supplier, 'sup-1');
    await userEvent.click(
      screen.getByRole('button', { name: 'Создать черновик КП' }),
    );
    expect(screen.getByText(PRICING_NOT_CONFIGURED_MESSAGE)).toBeInTheDocument();

    await userEvent.selectOptions(supplier, 'sup-2');
    expect(supplier).toHaveValue('sup-2');
    expect(screen.queryByText(PRICING_NOT_CONFIGURED_MESSAGE)).not.toBeInTheDocument();
  });

  it('does not let MANAGER convert or finalize', () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'manager-1',
        permissions: ['calculations:create', 'calculations:read', 'quotes:create'],
      },
    });
    render(<CalculationRequestPanel leadId="lead-1" />);
    expect(screen.getByRole('button', { name: 'Создать запрос расчёта' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Создать черновик КП' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Сформировать КП' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Поставщик')).not.toBeInTheDocument();
  });

  it('does not create a request from a deal/client view without leadId', () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'manager-1',
        permissions: ['calculations:create', 'calculations:read'],
      },
    });
    render(<CalculationRequestPanel clientId="client-1" />);
    expect(
      screen.queryByRole('button', { name: 'Создать запрос расчёта' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Новый запрос создаётся из карточки лида/),
    ).toBeInTheDocument();
  });

  it('hides convert when the request already has a quote', () => {
    requestFixture.status = 'processing';
    requestFixture.quotes = [{ id: 'quote-1' }];
    useAuthMock.mockReturnValue({
      user: {
        id: 'head-1',
        permissions: ['calculations:read', 'quotes:approve'],
      },
    });
    render(<CalculationRequestPanel leadId="lead-1" />);
    expect(
      screen.queryByRole('button', { name: 'Создать черновик КП' }),
    ).not.toBeInTheDocument();
  });
});
