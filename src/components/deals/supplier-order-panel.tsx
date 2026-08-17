'use client';

import { Button } from '@/components/ui/button';
import {
  normalizeSupplierOrderStatus,
  supplierOrderStatusLabels,
  useSupplierOrderByDeal,
  useUpdateSupplierOrderStatus,
  type SupplierOrderStatus,
} from '@/hooks/use-supplier-orders';
import { formatDate, formatDateTime } from '@/lib/format';
import { formatMoney } from '@/lib/currency';
import type { Deal } from '@/hooks/use-deals';

const STATUS_ACTIONS: { status: SupplierOrderStatus; label: string }[] = [
  { status: 'SENT_TO_PRODUCTION', label: 'Отправить в производство' },
  { status: 'IN_PRODUCTION', label: 'В производстве' },
  { status: 'SHIPPED', label: 'Отгружено' },
  { status: 'DELIVERED', label: 'Доставлено' },
];

type SupplierOrderPanelProps = {
  dealId: string;
  deal: Deal;
};

export function SupplierOrderPanel({ dealId, deal }: SupplierOrderPanelProps) {
  const orderQuery = useSupplierOrderByDeal(dealId);
  const updateStatus = useUpdateSupplierOrderStatus();
  const order = orderQuery.data;
  const currentStatus = normalizeSupplierOrderStatus(order?.status);
  const deliveryAddress =
    deal.delivery?.address ?? deal.deliveryAddress ?? order?.deliveryAddress;
  const deliveryCost =
    deal.delivery?.cost ??
    deal.deliveryCost ??
    order?.deliveryCost ??
    order?.deliveryAmount;
  const estimatedDate =
    deal.delivery?.estimatedDate ??
    deal.estimatedDeliveryDate ??
    order?.estimatedDate;

  return (
    <div className="space-y-4">
      <section className="rounded border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-950">
          Заказ поставщику
        </h3>
        {orderQuery.isLoading ? (
          <p className="mt-3 text-sm text-slate-600">Загрузка заказа...</p>
        ) : null}
        {orderQuery.isError ? (
          <p className="mt-3 text-sm text-red-600">
            Не удалось загрузить заказ поставщику.
          </p>
        ) : null}
        {!orderQuery.isLoading && !order ? (
          <p className="mt-3 text-sm text-slate-500">
            Заказ поставщику ещё не создан.
          </p>
        ) : null}
        {order ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <div>
                <div className="text-xs text-slate-500">Статус</div>
                <div className="mt-1 font-medium text-slate-900">
                  {currentStatus
                    ? supplierOrderStatusLabels[currentStatus]
                    : order.status}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Срок</div>
                <div className="mt-1 text-slate-900">
                  {formatDate(estimatedDate)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Трек-номер</div>
                <div className="mt-1 font-mono text-xs text-slate-900">
                  {order.trackingNumber || '—'}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_ACTIONS.map((action) => (
                <Button
                  key={action.status}
                  type="button"
                  size="sm"
                  variant={
                    currentStatus === action.status ? 'default' : 'outline'
                  }
                  disabled={
                    updateStatus.isPending || currentStatus === action.status
                  }
                  onClick={() => {
                    void updateStatus.mutateAsync({
                      id: order.id,
                      status: action.status,
                    });
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-950">Доставка</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">Адрес</div>
            <div className="mt-1 text-slate-900">{deliveryAddress || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Стоимость</div>
            <div className="mt-1 text-slate-900">{formatMoney(deliveryCost)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Ожидаемая дата</div>
            <div className="mt-1 text-slate-900">
              {estimatedDate ? formatDateTime(estimatedDate) : '—'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
