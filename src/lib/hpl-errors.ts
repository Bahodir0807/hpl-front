import { AxiosError } from 'axios';

export const PRICING_NOT_CONFIGURED_MESSAGE =
  'Для выбранной толщины пока не настроена закупочная цена.';

export const CUSTOM_SIZE_PRICING_NOT_CONFIGURED_MESSAGE =
  'Для нестандартного размера автоматический расчёт цены пока не настроен.';

export const CURRENCY_RATE_MISSING_MESSAGE =
  'Не установлен актуальный курс CNY → USD. Обратитесь к директору.';

export const QUOTE_APPROVAL_FORBIDDEN_MESSAGE =
  'Недостаточно прав: утверждение КП доступно только руководителю.';

export const QUOTE_PRICE_NOT_APPROVED_MESSAGE =
  'Сначала явно утвердите цену и валюту по каждой позиции.';

export const QUOTE_TERMS_LOCKED_MESSAGE =
  'КП уже финализировано и недоступно для изменений.';

export const QUOTE_APPROVAL_FORBIDDEN = 'QUOTE_APPROVAL_FORBIDDEN';
export const QUOTE_PRICE_NOT_APPROVED = 'QUOTE_PRICE_NOT_APPROVED';
export const QUOTE_TERMS_LOCKED = 'QUOTE_TERMS_LOCKED';
export const QUOTE_ALREADY_EXISTS = 'QUOTE_ALREADY_EXISTS';
export const QUOTE_SUPPLIER_REQUIRED = 'QUOTE_SUPPLIER_REQUIRED';
export const QUOTE_SUPPLIER_REQUIRED_MESSAGE =
  'Выберите поставщика для расчёта';

const CODED_HPL_ERRORS: Record<string, string> = {
  PRICING_NOT_CONFIGURED: PRICING_NOT_CONFIGURED_MESSAGE,
  CUSTOM_SIZE_PRICING_NOT_CONFIGURED: CUSTOM_SIZE_PRICING_NOT_CONFIGURED_MESSAGE,
  PURCHASE_PRICE_REQUIRED: 'Укажите закупочную цену, CNY/м²',
  MANUAL_PURCHASE_PRICE_FORBIDDEN:
    'Ручной ввод закупочной цены доступен только руководителю',
  INVALID_SUPPLIER_PRICE: 'Закупочная цена должна быть больше 0',
  CURRENCY_RATE_MISSING: CURRENCY_RATE_MISSING_MESSAGE,
  CURRENCY_RATE_NOT_CONFIGURED: CURRENCY_RATE_MISSING_MESSAGE,
  CURRENCY_RATE_NOT_FOUND: CURRENCY_RATE_MISSING_MESSAGE,
  NO_ACTIVE_CURRENCY_RATE: CURRENCY_RATE_MISSING_MESSAGE,
  FX_RATE_MISSING: CURRENCY_RATE_MISSING_MESSAGE,
  FX_RATE_NOT_CONFIGURED: CURRENCY_RATE_MISSING_MESSAGE,
  CNY_USD_RATE_MISSING: CURRENCY_RATE_MISSING_MESSAGE,
  INVALID_CURRENCY_RATE: 'Курс CNY → USD должен быть больше 0',
  [QUOTE_APPROVAL_FORBIDDEN]: QUOTE_APPROVAL_FORBIDDEN_MESSAGE,
  [QUOTE_PRICE_NOT_APPROVED]: QUOTE_PRICE_NOT_APPROVED_MESSAGE,
  [QUOTE_TERMS_LOCKED]: QUOTE_TERMS_LOCKED_MESSAGE,
  CALCULATION_REQUEST_LOCKED:
    'Запрос отправлен руководителю, его нельзя менять',
  [QUOTE_ALREADY_EXISTS]: 'Для этого запроса КП уже создано',
  [QUOTE_SUPPLIER_REQUIRED]: QUOTE_SUPPLIER_REQUIRED_MESSAGE,
  QUOTE_PDF_NOT_FINALIZED:
    'Финальный PDF КП формирует руководитель. Дождитесь готового документа',
  INVALID_QUANTITY: 'Количество листов должно быть больше 0',
};

export function createApiErrorFromPayload(
  payload: unknown,
  fallback = 'Ошибка сервера',
): AxiosError {
  const data =
    payload && typeof payload === 'object'
      ? payload
      : { message: typeof payload === 'string' ? payload : fallback };

  return new AxiosError(
    fallback,
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} } as never,
      data,
    },
  );
}

function isBlobLike(value: unknown): value is Blob {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { text?: unknown }).text === 'function'
  );
}

export async function materializeAxiosError(error: unknown): Promise<unknown> {
  if (!(error instanceof AxiosError) || !error.response) {
    return error;
  }

  const data = error.response.data;
  if (!isBlobLike(data)) {
    return error;
  }

  const text = await data.text();
  try {
    error.response.data = JSON.parse(text) as typeof error.response.data;
  } catch {
    error.response.data = { message: text };
  }

  return error;
}

function pushToken(tokens: string[], value: unknown): void {
  if (typeof value === 'string' && value.trim()) {
    tokens.push(value.trim());
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      pushToken(tokens, item);
    }
  }
}

function collectErrorTokens(error: unknown): string[] {
  const tokens: string[] = [];

  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && !isBlobLike(data)) {
      const record = data as Record<string, unknown>;
      pushToken(tokens, record.code);
      pushToken(tokens, record.errorCode);
      pushToken(tokens, record.error);
      pushToken(tokens, record.message);
      if (record.error && typeof record.error === 'object') {
        const nested = record.error as Record<string, unknown>;
        pushToken(tokens, nested.code);
        pushToken(tokens, nested.errorCode);
        pushToken(tokens, nested.message);
      }
    } else if (typeof error.message === 'string') {
      tokens.push(error.message);
    }
  } else if (error instanceof Error) {
    tokens.push(error.message);
  } else if (typeof error === 'string') {
    tokens.push(error);
  }

  return tokens;
}

function lookupCodedMessage(token: string): string | null {
  const compact = token.trim();
  if (CODED_HPL_ERRORS[compact]) {
    return CODED_HPL_ERRORS[compact];
  }

  const upper = compact.toUpperCase().replace(/[\s-]+/g, '_');
  for (const [code, message] of Object.entries(CODED_HPL_ERRORS)) {
    if (upper === code || upper.includes(code)) {
      return message;
    }
  }

  return null;
}

function looksLikeMissingFx(text: string): boolean {
  const normalized = text.toLowerCase();
  const mentionsRate =
    normalized.includes('currency rate') ||
    normalized.includes('fx') ||
    normalized.includes('курс') ||
    normalized.includes('exchange rate');
  const mentionsPair =
    (normalized.includes('cny') && normalized.includes('usd')) ||
    normalized.includes('cny') ||
    normalized.includes('currency');
  const mentionsMissing =
    normalized.includes('missing') ||
    normalized.includes('not configured') ||
    normalized.includes('not found') ||
    normalized.includes('no active') ||
    normalized.includes('не установлен') ||
    normalized.includes('отсутств');

  return mentionsRate && mentionsPair && mentionsMissing;
}

export function getApiErrorCode(error: unknown): string | null {
  const tokens = collectErrorTokens(error);
  for (const token of tokens) {
    const compact = token.trim();
    if (CODED_HPL_ERRORS[compact]) {
      return compact;
    }

    const upper = compact.toUpperCase().replace(/[\s-]+/g, '_');
    for (const code of Object.keys(CODED_HPL_ERRORS)) {
      if (upper === code || upper.includes(code)) {
        return code;
      }
    }
  }

  return null;
}

export function localizeHplBusinessError(error: unknown): string | null {
  const tokens = collectErrorTokens(error);
  for (const token of tokens) {
    const coded = lookupCodedMessage(token);
    if (coded) {
      return coded;
    }
  }

  const joined = tokens.join(' ');
  if (looksLikeMissingFx(joined)) {
    return CURRENCY_RATE_MISSING_MESSAGE;
  }
  if (
    joined.toLowerCase().includes('currency rate') &&
    (joined.toLowerCase().includes('greater') ||
      joined.toLowerCase().includes('positive') ||
      joined.includes('должен быть больше'))
  ) {
    return 'Курс CNY → USD должен быть больше 0';
  }
  if (
    joined.toLowerCase().includes('comment is required for other') ||
    joined.toLowerCase().includes('other loss reason')
  ) {
    return 'Для причины «Другое» нужен комментарий.';
  }
  if (joined.toLowerCase().includes('received quantity exceeds expected')) {
    return 'Принятое количество больше ожидаемого.';
  }

  return null;
}
