import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createApiErrorFromPayload,
  PRICING_NOT_CONFIGURED_MESSAGE,
  QUOTE_SUPPLIER_REQUIRED_MESSAGE,
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

  it('lets HEAD convert a submitted request without a global supplier', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'head-1',
        permissions: ['calculations:read', 'quotes:approve'],
      },
    });
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<CalculationRequestPanel leadId="lead-1" />);
    expect(screen.getByText('Отправлен руководителю')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Поставщик для расчёта req-1'),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Создать черновик КП' })[0],
    ).toBeEnabled();
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Создать черновик КП' })[0],
    );
    expect(convertMutate).toHaveBeenCalledWith({ id: 'req-1' });
  });

  it('shows the persisted manager note to HEAD as read-only', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'head-1',
        permissions: ['calculations:read', 'quotes:approve'],
      },
    });
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<CalculationRequestPanel leadId="lead-1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть' }));
    const note = screen.getByLabelText('Примечание менеджера / пожелания клиента');
    expect(note).toHaveValue('Нужен CIP');
    expect(note).toBeDisabled();
  });

  it('does not let HEAD create a request or send to HEAD', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'head-1',
        permissions: [
          'calculations:create',
          'calculations:read',
          'calculations:read_all',
          'quotes:approve',
        ],
      },
    });
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<CalculationRequestPanel leadId="lead-1" />);
    expect(
      screen.queryByRole('button', { name: 'Создать запрос расчёта' }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Открыть' }));
    expect(
      screen.queryByRole('button', { name: 'Отправить руководителю' }),
    ).not.toBeInTheDocument();
  });

  it('does not show a global supplier dropdown next to quote creation', () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'head-1',
        permissions: ['calculations:read', 'quotes:approve'],
      },
    });

    render(<CalculationRequestPanel leadId="lead-1" />);
    expect(
      screen.queryByLabelText('Поставщик для расчёта req-1'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Создать черновик КП' }),
    ).toBeEnabled();
  });

  it('keeps the screen open and shows a per-item supplier error', async () => {
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

    await userEvent.click(
      screen.getByRole('button', { name: 'Создать черновик КП' }),
    );
    expect(screen.getByText(QUOTE_SUPPLIER_REQUIRED_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Создать черновик КП' }),
    ).toBeEnabled();
  });

  it('shows a pricing error inline without a global supplier selector', async () => {
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

    await userEvent.click(
      screen.getByRole('button', { name: 'Создать черновик КП' }),
    );
    expect(screen.getByText(PRICING_NOT_CONFIGURED_MESSAGE)).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Поставщик для расчёта req-1'),
    ).not.toBeInTheDocument();
  });

  it('does not let MANAGER convert, finalize, or create a request manually', () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'manager-1',
        permissions: [
          'calculations:create',
          'calculations:update',
          'calculations:read',
          'quotes:create',
          'quotes:client_accept',
        ],
      },
    });
    render(<CalculationRequestPanel leadId="lead-1" />);
    expect(
      screen.queryByRole('button', { name: 'Создать запрос расчёта' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Отправить руководителю' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Создать черновик КП' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Сформировать КП' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Поставщик')).not.toBeInTheDocument();
  });

  it('lets MANAGER submit a DRAFT and keeps SUBMITTED immutable', async () => {
    requestFixture.status = 'draft';
    useAuthMock.mockReturnValue({
      user: {
        id: 'manager-1',
        permissions: [
          'calculations:create',
          'calculations:update',
          'calculations:read',
          'quotes:client_accept',
        ],
      },
    });
    const { default: userEvent } = await import('@testing-library/user-event');
    const { rerender } = render(<CalculationRequestPanel leadId="lead-1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть' }));
    expect(
      screen.getByRole('button', { name: 'Отправить руководителю' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Создать запрос расчёта' }),
    ).not.toBeInTheDocument();

    requestFixture.status = 'submitted';
    rerender(<CalculationRequestPanel leadId="lead-1" />);
    expect(
      screen.queryByRole('button', { name: 'Отправить руководителю' }),
    ).not.toBeInTheDocument();
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
      screen.queryByText(/Новый запрос создаётся из карточки лида/),
    ).not.toBeInTheDocument();
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
