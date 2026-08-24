import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './errors';
import {
  CLIENT_ACCEPTANCE_REQUIRED_MESSAGE,
  SHIPMENT_PAYMENT_REQUIRED_MESSAGE,
  SUPPLIER_ORDER_FORBIDDEN_MESSAGE,
  SUPPLIER_ORDER_STALE_STATE_MESSAGE,
  getSupplierOrderErrorMessage,
} from './supplier-order-errors';

function axiosError(
  status: number,
  data: Record<string, unknown>,
): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: {} } as never,
    data,
  });
}

describe('supplier order business errors', () => {
  it('maps missing client acceptance to the confirmed Russian copy', () => {
    expect(
      getErrorMessage(
        axiosError(409, {
          message:
            'Supplier order requires an internally approved Quote with recorded client acceptance',
        }),
      ),
    ).toBe(CLIENT_ACCEPTANCE_REQUIRED_MESSAGE);
  });

  it('maps the shipment payment gate to Russian copy', () => {
    expect(
      getErrorMessage(
        axiosError(409, {
          message: 'Delivery blocked because required payment is not confirmed',
        }),
      ),
    ).toBe(SHIPMENT_PAYMENT_REQUIRED_MESSAGE);
  });

  it('maps 403 without logging the user out and 409 as stale state', () => {
    expect(
      getSupplierOrderErrorMessage(axiosError(403, { message: 'Forbidden' })),
    ).toBe(SUPPLIER_ORDER_FORBIDDEN_MESSAGE);
    expect(
      getSupplierOrderErrorMessage(
        axiosError(409, { message: 'Supplier order status changed concurrently' }),
      ),
    ).toBe(SUPPLIER_ORDER_STALE_STATE_MESSAGE);
  });
});
