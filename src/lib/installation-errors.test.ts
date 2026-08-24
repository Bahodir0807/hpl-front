import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './errors';
import {
  DISTINCT_INSTALLATION_ACTORS_COPY,
  MATERIAL_NOT_DELIVERED_MESSAGE,
} from './installation-presentation';
import {
  getInstallationErrorMessage,
  INSTALLATION_ALREADY_COMPLETED_MESSAGE,
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
  it('maps same-user dual confirmation to the Russian business message', () => {
    expect(
      getErrorMessage(
        axiosError(409, {
          message: 'Installation completion requires two distinct users',
        }),
      ),
    ).toBe(DISTINCT_INSTALLATION_ACTORS_COPY);
  });

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
      getInstallationErrorMessage(
        axiosError(409, { message: 'Cannot start installation after completion' }),
      ),
    ).toBe(INSTALLATION_ALREADY_COMPLETED_MESSAGE);
    expect(
      getInstallationErrorMessage(axiosError(403, { message: 'Forbidden' })),
    ).toBe(INSTALLATION_FORBIDDEN_MESSAGE);
  });
});
