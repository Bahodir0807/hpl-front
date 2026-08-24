import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './errors';
import {
  FORBIDDEN_ACTION_MESSAGE,
  INVALID_DEAL_TRANSITION_MESSAGE,
} from './operational-errors';

function axiosError(status: number, message: string): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: {} } as never,
    data: { message },
  });
}

describe('operational error copy', () => {
  it('maps invalid Deal transitions and forbidden actions', () => {
    expect(
      getErrorMessage(
        axiosError(400, 'Cannot change stage from terminal WON. Contact head manager.'),
      ),
    ).toBe(INVALID_DEAL_TRANSITION_MESSAGE);
    expect(getErrorMessage(axiosError(403, 'Forbidden'))).toBe(
      FORBIDDEN_ACTION_MESSAGE,
    );
  });
});
