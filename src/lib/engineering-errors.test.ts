import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import {
  isFacadeThicknessConfirmation,
  localizeEngineeringError,
} from './engineering-errors';
import { ru } from '@/i18n/ru';

function axiosError(code: string): AxiosError {
  return new AxiosError('conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: { headers: {} } as never,
    data: { statusCode: 409, errorCode: code, message: 'x' },
  });
}

describe('engineering-errors', () => {
  it('maps FACADE_THICKNESS_CONFIRM_REQUIRED to localized copy', () => {
    const message = localizeEngineeringError(
      axiosError('FACADE_THICKNESS_CONFIRM_REQUIRED'),
      ru,
    );
    expect(message).toBe(ru.engineering.facadeThicknessConflict);
    expect(isFacadeThicknessConfirmation(axiosError('FACADE_THICKNESS_CONFIRM_REQUIRED'))).toBe(
      true,
    );
  });
});
