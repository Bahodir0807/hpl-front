'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import type { Deal } from '@/hooks/use-deals';
import { useOrders, type PaymentStatus } from '@/hooks/use-orders';
import { useSuppliers } from '@/hooks/use-panels';
import {
  useConfirmSupplierOrderClientDelivery,
  useConfirmSupplierOrderReady,
  useCreateSupplierOrder,
  useShipSupplierOrder,
  useSupplierOrdersByDeal,
  useUpdateSupplierOrderDates,
} from '@/hooks/use-supplier-orders';
import { formatDate, formatDateTime } from '@/lib/format';
import { formatSupplierName, paymentStatusLabels } from '@/lib/labels';
import { getSupplierOrderErrorMessage } from '@/lib/supplier-order-errors';
import {
  canCreateSupplierOrder,
  compactSupplierOrderId,
  dateInputToIso,
  getSupplierOrderActions,
  isCustomerOrderPaid,
  normalizeSupplierOrderStatus,
  supplierOrderStatusLabels,
  toDateInputValue,
  type SupplierOrderUiAction,
} from '@/lib/supplier-order-presentation';
import type { SupplierOrder } from '@/types/hpl';

type SupplierOrderPanelProps = {
  dealId: string;
  deal: Deal;
  highlightedSupplierOrderId?: string | null;
};

type DateFormState = {
  orderedAt: string;
  expectedReadyAt: string;
  expectedShipmentAt: string;
  expectedArrivalAt: string;
  comment: string;
};

const emptyDateForm: DateFormState = {
  orderedAt: '',
  expectedReadyAt: '',
  expectedShipmentAt: '',
  expectedArrivalAt: '',
  comment: '',
};

function paymentLabel(status?: string | null): string {
  if (!status) {
    return '—';
  }

  return paymentStatusLabels[status as PaymentStatus] ?? status;
}

export function SupplierOrderPanel({
  dealId,
  deal,
  highlightedSupplierOrderId,
}: SupplierOrderPanelProps) {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const canManage = canCreateSupplierOrder(permissions);
  const ordersQuery = useSupplierOrdersByDeal(dealId);
  const customerOrdersQuery = useOrders({ dealId, limit: 5 });
  const [createFormForced, setCreateFormForced] = useState<
    'open' | 'closed' | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const supplierOrders = useMemo(
    () => ordersQuery.data ?? [],
    [ordersQuery.data],
  );
  const showCreateForm =
    createFormForced === 'open' ||
    (createFormForced !== 'closed' && canManage && supplierOrders.length === 0);
  const customerOrder =
    customerOrdersQuery.data?.items[0] ?? deal.order ?? null;
  const paymentStatus = customerOrder?.paymentStatus ?? null;
  const paid = isCustomerOrderPaid(paymentStatus);

  useEffect(() => {
    if (!highlightedSupplierOrderId) {
      return;
    }

    const node = document.getElementById(
      `supplier-order-${highlightedSupplierOrderId}`,
    );
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightedSupplierOrderId, supplierOrders]);

  const deliveryAddress =
    deal.delivery?.address ?? deal.deliveryAddress ?? customerOrder?.deliveryAddress;

  return (
    <div className="space-y-4">
      <section className="rounded border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              Заказы поставщику
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Один заказ клиента может закрываться несколькими заказами
              поставщику.
            </p>
          </div>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              variant={showCreateForm ? 'outline' : 'default'}
              onClick={() => {
                setCreateFormForced(showCreateForm ? 'closed' : 'open');
                setActionError(null);
              }}
            >
              {showCreateForm
                ? 'Скрыть форму'
                : 'Добавить заказ поставщику'}
            </Button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">Оплата заказа клиента</div>
            <div className="mt-1 font-medium text-slate-900">
              {customerOrdersQuery.isLoading
                ? 'Загрузка...'
                : paymentLabel(paymentStatus)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Отгрузка</div>
            <div className="mt-1 text-slate-900">
              {paid
                ? 'Полная оплата подтверждена — отгрузка разрешена бэкендом.'
                : 'Отгрузка недоступна: заказ ещё не оплачен полностью.'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Адрес доставки</div>
            <div className="mt-1 text-slate-900">{deliveryAddress || '—'}</div>
          </div>
        </div>

        {actionError ? (
          <p className="mt-3 text-sm text-red-700">{actionError}</p>
        ) : null}

        {canManage && showCreateForm ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <CreateSupplierOrderForm
              dealId={dealId}
              onCreated={() => {
                setCreateFormForced('closed');
                setActionError(null);
              }}
              onError={setActionError}
            />
          </div>
        ) : null}

        {ordersQuery.isLoading ? (
          <div className="mt-4 space-y-2" aria-busy="true">
            <div className="h-16 animate-pulse rounded bg-slate-100" />
            <div className="h-16 animate-pulse rounded bg-slate-100" />
            <p className="text-sm text-slate-600">Загрузка заказов поставщику...</p>
          </div>
        ) : null}

        {ordersQuery.isError ? (
          <p className="mt-4 text-sm text-red-600">
            {getSupplierOrderErrorMessage(ordersQuery.error) ||
              'Не удалось загрузить заказы поставщику.'}
          </p>
        ) : null}

        {!ordersQuery.isLoading &&
        !ordersQuery.isError &&
        supplierOrders.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Заказы поставщику ещё не созданы.
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          {supplierOrders.map((order) => (
            <SupplierOrderCard
              key={order.id}
              order={order}
              highlighted={order.id === highlightedSupplierOrderId}
              permissions={permissions}
              paid={paid}
              paymentKnown={!customerOrdersQuery.isLoading}
              onError={setActionError}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function CreateSupplierOrderForm({
  dealId,
  onCreated,
  onError,
}: {
  dealId: string;
  onCreated: () => void;
  onError: (message: string) => void;
}) {
  const suppliersQuery = useSuppliers();
  const createOrder = useCreateSupplierOrder();
  const [supplierId, setSupplierId] = useState('');
  const [form, setForm] = useState<DateFormState>(emptyDateForm);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const orderedAt = dateInputToIso(form.orderedAt);
    const expectedReadyAt = dateInputToIso(form.expectedReadyAt);

    if (!supplierId || !orderedAt || !expectedReadyAt) {
      onError('Укажите поставщика, дату заказа и ожидаемую готовность.');
      return;
    }

    try {
      await createOrder.mutateAsync({
        dealId,
        supplierId,
        orderedAt,
        expectedReadyAt,
        expectedShipmentAt: dateInputToIso(form.expectedShipmentAt),
        expectedArrivalAt: dateInputToIso(form.expectedArrivalAt),
        comment: form.comment.trim() || undefined,
      });
      setSupplierId('');
      setForm(emptyDateForm);
      onCreated();
    } catch (error) {
      onError(getSupplierOrderErrorMessage(error));
    }
  };

  return (
    <form className="space-y-3" onSubmit={(event) => void submit(event)}>
      <h4 className="text-sm font-medium text-slate-900">
        Новый заказ поставщику
      </h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-700">
          <span className="mb-1 block text-xs text-slate-500">Поставщик</span>
          <select
            required
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="">Выберите поставщика</option>
            {(suppliersQuery.data ?? []).map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {formatSupplierName(supplier.code, supplier.name)}
              </option>
            ))}
          </select>
        </label>
        <DateField
          label="Дата заказа"
          required
          value={form.orderedAt}
          onChange={(orderedAt) => setForm((current) => ({ ...current, orderedAt }))}
        />
        <DateField
          label="Ожидаемая готовность"
          required
          value={form.expectedReadyAt}
          onChange={(expectedReadyAt) =>
            setForm((current) => ({ ...current, expectedReadyAt }))
          }
        />
        <DateField
          label="Ожидаемая отгрузка"
          value={form.expectedShipmentAt}
          onChange={(expectedShipmentAt) =>
            setForm((current) => ({ ...current, expectedShipmentAt }))
          }
        />
        <DateField
          label="Ожидаемое прибытие"
          value={form.expectedArrivalAt}
          onChange={(expectedArrivalAt) =>
            setForm((current) => ({ ...current, expectedArrivalAt }))
          }
        />
      </div>
      <label className="block text-sm text-slate-700">
        <span className="mb-1 block text-xs text-slate-500">Комментарий</span>
        <textarea
          value={form.comment}
          onChange={(event) =>
            setForm((current) => ({ ...current, comment: event.target.value }))
          }
          rows={2}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </label>
      <Button type="submit" size="sm" disabled={createOrder.isPending}>
        {createOrder.isPending ? 'Создание...' : 'Создать заказ поставщику'}
      </Button>
    </form>
  );
}

function SupplierOrderCard({
  order,
  highlighted,
  permissions,
  paid,
  paymentKnown,
  onError,
}: {
  order: SupplierOrder;
  highlighted: boolean;
  permissions: readonly string[];
  paid: boolean;
  paymentKnown: boolean;
  onError: (message: string) => void;
}) {
  const updateDates = useUpdateSupplierOrderDates();
  const confirmReady = useConfirmSupplierOrderReady();
  const shipOrder = useShipSupplierOrder();
  const confirmDelivery = useConfirmSupplierOrderClientDelivery();
  const status = normalizeSupplierOrderStatus(order.status);
  const actions = useMemo(
    () =>
      getSupplierOrderActions({
        status: order.status,
        readyConfirmedAt: order.readyConfirmedAt,
        permissions,
      }),
    [order.readyConfirmedAt, order.status, permissions],
  );
  const [dates, setDates] = useState<DateFormState>(() => datesFromOrder(order));
  const pending =
    updateDates.isPending ||
    confirmReady.isPending ||
    shipOrder.isPending ||
    confirmDelivery.isPending;

  const runAction = async (action: SupplierOrderUiAction): Promise<void> => {
    try {
      if (action === 'edit-dates') {
        await updateDates.mutateAsync({
          id: order.id,
          dealId: order.dealId,
          expectedReadyAt: dateInputToIso(dates.expectedReadyAt),
          expectedShipmentAt: dateInputToIso(dates.expectedShipmentAt),
          expectedArrivalAt: dateInputToIso(dates.expectedArrivalAt),
          comment: dates.comment,
        });
        return;
      }

      const payload = { id: order.id, dealId: order.dealId };
      if (action === 'confirm-ready') {
        await confirmReady.mutateAsync(payload);
        return;
      }
      if (action === 'ship') {
        await shipOrder.mutateAsync(payload);
        return;
      }
      await confirmDelivery.mutateAsync(payload);
    } catch (error) {
      onError(getSupplierOrderErrorMessage(error));
    }
  };

  const shipDisabled = !paid || !paymentKnown || pending;

  return (
    <article
      id={`supplier-order-${order.id}`}
      className={`rounded border p-4 ${
        highlighted
          ? 'border-slate-900 ring-1 ring-slate-900'
          : 'border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">
            Заказ {compactSupplierOrderId(order.id)}
          </div>
          <div className="mt-1 text-sm text-slate-700">
            {formatSupplierName(order.supplier?.code, order.supplier?.name, '—')}
          </div>
        </div>
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {status ? supplierOrderStatusLabels[status] : order.status}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
        <Info label="Дата заказа" value={formatDate(order.orderedAt)} />
        <Info
          label="Ожидаемая готовность"
          value={formatDate(order.expectedReadyAt)}
        />
        <Info
          label="Ожидаемая отгрузка"
          value={formatDate(order.expectedShipmentAt)}
        />
        <Info
          label="Ожидаемое прибытие"
          value={formatDate(order.expectedArrivalAt)}
        />
      </dl>

      <div className="mt-3 text-sm">
        <div className="text-xs text-slate-500">Готовность</div>
        <div className="mt-1 text-slate-900">
          {order.readyConfirmedAt
            ? `Подтверждена ${formatDateTime(order.readyConfirmedAt)}`
            : 'Ещё не подтверждена'}
        </div>
      </div>

      <div className="mt-3 text-sm">
        <div className="text-xs text-slate-500">Доставка клиенту</div>
        <div className="mt-1 text-slate-900">
          {status === 'DELIVERED'
            ? `Подтверждена ${formatDateTime(order.deliveredAt)}`
            : status === 'SHIPPED'
              ? 'Отгружено, ожидает подтверждения доставки клиенту'
              : 'Ещё не доставлено'}
        </div>
      </div>

      {order.comment ? (
        <p className="mt-3 text-sm text-slate-700">{order.comment}</p>
      ) : null}

      {actions.includes('edit-dates') ? (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <DateField
              label="Ожидаемая готовность"
              value={dates.expectedReadyAt}
              onChange={(expectedReadyAt) =>
                setDates((current) => ({ ...current, expectedReadyAt }))
              }
            />
            <DateField
              label="Ожидаемая отгрузка"
              value={dates.expectedShipmentAt}
              onChange={(expectedShipmentAt) =>
                setDates((current) => ({ ...current, expectedShipmentAt }))
              }
            />
            <DateField
              label="Ожидаемое прибытие"
              value={dates.expectedArrivalAt}
              onChange={(expectedArrivalAt) =>
                setDates((current) => ({ ...current, expectedArrivalAt }))
              }
            />
          </div>
          <label className="block text-sm text-slate-700">
            <span className="mb-1 block text-xs text-slate-500">Комментарий</span>
            <textarea
              value={dates.comment}
              onChange={(event) =>
                setDates((current) => ({
                  ...current,
                  comment: event.target.value,
                }))
              }
              rows={2}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => void runAction('edit-dates')}
          >
            {updateDates.isPending ? 'Сохранение...' : 'Сохранить даты'}
          </Button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.includes('confirm-ready') ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => void runAction('confirm-ready')}
          >
            {confirmReady.isPending
              ? 'Подтверждение...'
              : 'Подтвердить готовность'}
          </Button>
        ) : null}
        {actions.includes('ship') ? (
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              size="sm"
              disabled={shipDisabled}
              title={
                paid
                  ? undefined
                  : 'Отгрузка недоступна: заказ ещё не оплачен полностью.'
              }
              onClick={() => void runAction('ship')}
            >
              {shipOrder.isPending ? 'Отгрузка...' : 'Отгрузить'}
            </Button>
            {!paid ? (
              <span className="text-xs text-amber-700">
                Отгрузка недоступна: заказ ещё не оплачен полностью.
              </span>
            ) : null}
          </div>
        ) : null}
        {actions.includes('confirm-client-delivery') ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => void runAction('confirm-client-delivery')}
          >
            {confirmDelivery.isPending
              ? 'Подтверждение...'
              : 'Подтвердить доставку клиенту'}
          </Button>
        ) : null}
        {status === 'DELIVERED' ? (
          <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            Доставка клиенту завершена
          </span>
        ) : null}
      </div>
    </article>
  );
}

function datesFromOrder(order: SupplierOrder): DateFormState {
  return {
    orderedAt: toDateInputValue(order.orderedAt),
    expectedReadyAt: toDateInputValue(order.expectedReadyAt),
    expectedShipmentAt: toDateInputValue(order.expectedShipmentAt),
    expectedArrivalAt: toDateInputValue(order.expectedArrivalAt),
    comment: order.comment ?? '',
  };
}

function DateField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      <input
        type="date"
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value}</dd>
    </div>
  );
}
