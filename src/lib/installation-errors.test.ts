import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { MATERIAL_NOT_DELIVERED_MESSAGE } from './installation-presentation';
import {
  getInstallationErrorMessage,
  INSTALLATION_FORBIDDEN_MESSAGE,
  INSTALLATION_NOT_REQUIRED_ERROR,
} from './installation-errors';

function axiosError(status: number, data: Record<string, unknown>): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: {} } as never,
    data,
  });
}

describe('installation business errors', () => {
  it('maps material delivery, not-required, completed and forbidden conditions', () => {
    expect(
      getInstallationErrorMessage(
        axiosError(409, { message: 'Material has not been delivered to the client' }),
      ),
    ).toBe(MATERIAL_NOT_DELIVERED_MESSAGE);
    expect(
      getInstallationErrorMessage(
        axiosError(409, { message: 'Installation is not required for this deal' }),
      ),
    ).toBe(INSTALLATION_NOT_REQUIRED_ERROR);
    expect(
      getInstallationErrorMessage(axiosError(403, { message: 'Forbidden' })),
    ).toBe(INSTALLATION_FORBIDDEN_MESSAGE);
  });
});
