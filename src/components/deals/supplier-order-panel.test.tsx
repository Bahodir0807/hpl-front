import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Deal } from '@/hooks/use-deals';
import type { SupplierOrder } from '@/types/hpl';
import { SupplierOrderPanel } from './supplier-order-panel';

const useAuthMock = vi.fn();
const useSupplierOrdersByDealMock = vi.fn();
const useOrdersMock = vi.fn();
const useSuppliersMock = vi.fn();
const useCreateSupplierOrderMock = vi.fn();
const useUpdateSupplierOrderDatesMock = vi.fn();
const useConfirmReadyMock = vi.fn();
const useShipMock = vi.fn();
const useConfirmDeliveryMock = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/use-supplier-orders', () => ({
  useSupplierOrdersByDeal: (...args: unknown[]) =>
    useSupplierOrdersByDealMock(...args),
  useCreateSupplierOrder: () => useCreateSupplierOrderMock(),
  useUpdateSupplierOrderDates: () => useUpdateSupplierOrderDatesMock(),
  useConfirmSupplierOrderReady: () => useConfirmReadyMock(),
  useShipSupplierOrder: () => useShipMock(),
  useConfirmSupplierOrderClientDelivery: () => useConfirmDeliveryMock(),
}));

vi.mock('@/hooks/use-orders', () => ({
  useOrders: (...args: unknown[]) => useOrdersMock(...args),
}));

vi.mock('@/hooks/use-panels', () => ({
  useSuppliers: () => useSuppliersMock(),
}));

function idleMutation() {
  return {
    mutateAsync: vi.fn(),
    isPending: false,
  };
}

function auth(permissions: string[], roles: string[] = ['HEAD']) {
  return {
    user: {
      id: 'user-1',
      email: 'head@hpl.local',
      roles,
      permissions,
    },
    hasPermission: (slug: string) => permissions.includes(slug),
    isInitialized: true,
    login: vi.fn(),
    logout: vi.fn(),
  };
}

function deal(): Deal {
  return {
    id: 'deal-1',
    title: 'Сделка HPL',
    stage: 'PAYMENT_PREPARATION',
    clientId: 'client-1',
    ownerId: 'owner-1',
    totalAmount: '1000',
    createdAt: '2026-08-19T10:00:00.000Z',
    updatedAt: '2026-08-19T10:00:00.000Z',
  };
}

function supplierOrder(overrides: Partial<SupplierOrder> = {}): SupplierOrder {
  return {
    id: 'aaaaaaaa-1111-2222-3333-444444444444',
    dealId: 'deal-1',
    supplierId: 'sup-1',
    status: 'IN_PRODUCTION',
    orderedAt: '2026-08-10T00:00:00.000Z',
    expectedReadyAt: '2026-08-20T00:00:00.000Z',
    expectedShipmentAt: '2026-08-22T00:00:00.000Z',
    expectedArrivalAt: '2026-08-28T00:00:00.000Z',
    comment: 'Первая партия',
    supplier: { id: 'sup-1', code: 'wuya', name: 'Wuya' },
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  };
}

function setupPanel({
  permissions,
  roles,
  orders,
  paymentStatus = 'UNPAID',
}: {
  permissions: string[];
  roles?: string[];
  orders: SupplierOrder[];
  paymentStatus?: string;
}) {
  useAuthMock.mockReturnValue(auth(permissions, roles));
  useSupplierOrdersByDealMock.mockReturnValue({
    data: orders,
    isLoading: false,
    isError: false,
    error: null,
  });
  useOrdersMock.mockReturnValue({
    data: {
      items: [
        {
          id: 'order-1',
          paymentStatus,
          dealId: 'deal-1',
        },
      ],
    },
    isLoading: false,
  });
  useSuppliersMock.mockReturnValue({
    data: [{ id: 'sup-1', code: 'wuya', name: 'Wuya' }],
  });
  useCreateSupplierOrderMock.mockReturnValue(idleMutation());
  useUpdateSupplierOrderDatesMock.mockReturnValue(idleMutation());
  useConfirmReadyMock.mockReturnValue(idleMutation());
  useShipMock.mockReturnValue(idleMutation());
  useConfirmDeliveryMock.mockReturnValue(idleMutation());
}

describe('SupplierOrderPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders multiple supplier orders for one Deal', () => {
    setupPanel({
      permissions: ['supplier_orders:manage', 'supplier_orders:confirm_client_delivery'],
      orders: [
        supplierOrder(),
        supplierOrder({
          id: 'bbbbbbbb-1111-2222-3333-555555555555',
          supplierId: 'sup-2',
          status: 'READY_FOR_SHIPMENT',
          readyConfirmedAt: '2026-08-20T10:00:00.000Z',
          supplier: { id: 'sup-2', code: 'tianran', name: 'Tianran' },
          comment: 'Вторая партия',
        }),
      ],
    });

    render(<SupplierOrderPanel dealId="deal-1" deal={deal()} />);

    expect(screen.getByText('Заказ AAAAAAAA')).toBeInTheDocument();
    expect(screen.getByText('Заказ BBBBBBBB')).toBeInTheDocument();
    expect(screen.getByText('Вуя')).toBeInTheDocument();
    expect(screen.getByText('Тианран')).toBeInTheDocument();
    expect(screen.getByText('В производстве')).toBeInTheDocument();
    expect(screen.getByText('Готов к отгрузке')).toBeInTheDocument();
    expect(screen.queryByText('READY_TO_SHIP')).not.toBeInTheDocument();
  });

  it('shows create for HEAD/DIRECTOR and hides it for MANAGER and ADMIN-only', () => {
    setupPanel({
      permissions: ['supplier_orders:manage'],
      roles: ['HEAD'],
      orders: [],
    });
    const { rerender } = render(
      <SupplierOrderPanel dealId="deal-1" deal={deal()} />,
    );
    expect(
      screen.getByRole('button', { name: 'Создать заказ поставщику' }),
    ).toBeInTheDocument();

    setupPanel({
      permissions: ['supplier_orders:manage'],
      roles: ['DIRECTOR'],
      orders: [],
    });
    rerender(<SupplierOrderPanel dealId="deal-1" deal={deal()} />);
    expect(
      screen.getByRole('button', { name: 'Создать заказ поставщику' }),
    ).toBeInTheDocument();

    setupPanel({
      permissions: ['supplier_orders:confirm_client_delivery'],
      roles: ['MANAGER'],
      orders: [],
    });
    rerender(<SupplierOrderPanel dealId="deal-1" deal={deal()} />);
    expect(
      screen.queryByRole('button', { name: 'Создать заказ поставщику' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Заказы поставщику ещё не созданы.')).toBeInTheDocument();

    setupPanel({
      permissions: ['users:manage', 'admin:queues'],
      roles: ['ADMIN'],
      orders: [],
    });
    rerender(<SupplierOrderPanel dealId="deal-1" deal={deal()} />);
    expect(
      screen.queryByRole('button', { name: 'Создать заказ поставщику' }),
    ).not.toBeInTheDocument();
  });

  it('lets MANAGER confirm client delivery without create/dates/ready/ship', () => {
    setupPanel({
      permissions: ['supplier_orders:confirm_client_delivery'],
      roles: ['MANAGER'],
      orders: [
        supplierOrder({
          status: 'SHIPPED',
        }),
      ],
      paymentStatus: 'PAID',
    });

    render(<SupplierOrderPanel dealId="deal-1" deal={deal()} />);

    expect(
      screen.getByRole('button', { name: 'Подтвердить доставку клиенту' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Создать заказ поставщику' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Сохранить даты' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Подтвердить готовность' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Отгрузить' })).not.toBeInTheDocument();
  });

  it('disables HEAD shipment until the customer order is PAID', () => {
    setupPanel({
      permissions: [
        'supplier_orders:manage',
        'supplier_orders:confirm_client_delivery',
      ],
      orders: [
        supplierOrder({
          status: 'READY_FOR_SHIPMENT',
          readyConfirmedAt: '2026-08-20T10:00:00.000Z',
        }),
      ],
      paymentStatus: 'PARTIALLY_PAID',
    });

    render(<SupplierOrderPanel dealId="deal-1" deal={deal()} />);

    expect(screen.getByRole('button', { name: 'Отгрузить' })).toBeDisabled();
    expect(
      screen.getAllByText('Отгрузка недоступна: заказ ещё не оплачен полностью.')
        .length,
    ).toBeGreaterThan(0);
  });
});
