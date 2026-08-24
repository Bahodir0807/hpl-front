import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './errors';
import {
  CURRENCY_RATE_MISSING_MESSAGE,
  CUSTOM_SIZE_PRICING_NOT_CONFIGURED_MESSAGE,
  PRICING_NOT_CONFIGURED_MESSAGE,
  QUOTE_APPROVAL_FORBIDDEN_MESSAGE,
  QUOTE_PRICE_NOT_APPROVED_MESSAGE,
  QUOTE_SUPPLIER_REQUIRED_MESSAGE,
  QUOTE_TERMS_LOCKED_MESSAGE,
  materializeAxiosError,
} from './hpl-errors';

function axiosError(data: Record<string, unknown>): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: {} } as never,
    data,
  });
}

describe('HPL calculation business errors', () => {
  it('maps PRICING_NOT_CONFIGURED to Russian copy', () => {
    expect(getErrorMessage(axiosError({ message: 'PRICING_NOT_CONFIGURED' }))).toBe(
      PRICING_NOT_CONFIGURED_MESSAGE,
    );
  });

  it('maps CUSTOM_SIZE_PRICING_NOT_CONFIGURED to Russian copy', () => {
    expect(
      getErrorMessage(axiosError({ code: 'CUSTOM_SIZE_PRICING_NOT_CONFIGURED' })),
    ).toBe(CUSTOM_SIZE_PRICING_NOT_CONFIGURED_MESSAGE);
  });

  it('maps a missing CNY→USD CurrencyRate to a director-facing message', () => {
    expect(
      getErrorMessage(
        axiosError({ message: 'No active currency rate for CNY to USD' }),
      ),
    ).toBe(CURRENCY_RATE_MISSING_MESSAGE);
  });

  it('maps OTHER loss comment and warehouse over-receipt errors', () => {
    expect(
      getErrorMessage(
        axiosError({ message: 'comment is required for OTHER loss reason' }),
      ),
    ).toBe('Для причины «Другое» нужен комментарий.');
    expect(
      getErrorMessage(
        axiosError({ message: 'Received quantity exceeds expected quantity' }),
      ),
    ).toBe('Принятое количество больше ожидаемого.');
    expect(
      getErrorMessage(
        axiosError({ message: 'Currency rate must be greater than 0' }),
      ),
    ).toBe('Курс CNY → USD должен быть больше 0');
  });

  it('maps quote commercial workflow codes without exposing raw bodies', () => {
    expect(
      getErrorMessage(axiosError({ code: 'QUOTE_APPROVAL_FORBIDDEN' })),
    ).toBe(QUOTE_APPROVAL_FORBIDDEN_MESSAGE);
    expect(
      getErrorMessage(axiosError({ message: 'QUOTE_PRICE_NOT_APPROVED' })),
    ).toBe(QUOTE_PRICE_NOT_APPROVED_MESSAGE);
    expect(
      getErrorMessage(axiosError({ errorCode: 'QUOTE_TERMS_LOCKED' })),
    ).toBe(QUOTE_TERMS_LOCKED_MESSAGE);
    expect(
      getErrorMessage(axiosError({ code: 'QUOTE_SUPPLIER_REQUIRED' })),
    ).toBe(QUOTE_SUPPLIER_REQUIRED_MESSAGE);
  });

  it('extracts quote codes from a JSON blob Axios payload', async () => {
    const error = axiosError({});
    error.response!.data = {
      text: async () =>
        JSON.stringify({
          errorCode: 'QUOTE_PDF_NOT_FINALIZED',
          message: 'raw',
        }),
    };
    const materialized = await materializeAxiosError(error);
    expect(getErrorMessage(materialized)).toBe(
      'Финальный PDF КП формирует руководитель. Дождитесь готового документа',
    );
  });
});
