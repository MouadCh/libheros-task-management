import { describe, expect, it } from 'bun:test';
import { FetchError } from 'ofetch';
import type { ApiErrorResponse } from '@libheros/contracts';
import { AUTH_ACCESS_TOKEN_EXPIRED_CODE } from '../constants/auth.constants';
import { shouldRefreshAndRetry } from './auth-retry';

function createExpiredAccessError(): FetchError {
  const error = new FetchError('expired');
  error.statusCode = 401;
  error.data = {
    statusCode: 401,
    code: AUTH_ACCESS_TOKEN_EXPIRED_CODE,
    message: 'Access token has expired',
    timestamp: new Date().toISOString(),
    path: '/lists',
    requestId: 'req-1',
  } satisfies ApiErrorResponse;
  return error;
}

describe('shouldRefreshAndRetry', () => {
  it('returns true for AUTH_ACCESS_TOKEN_EXPIRED when refresh is allowed', () => {
    expect(
      shouldRefreshAndRetry({
        skipAuthRefresh: false,
        error: createExpiredAccessError(),
      }),
    ).toBe(true);
  });

  it('returns false when skipAuthRefresh is true', () => {
    expect(
      shouldRefreshAndRetry({
        skipAuthRefresh: true,
        error: createExpiredAccessError(),
      }),
    ).toBe(false);
  });

  it('returns false for other errors', () => {
    expect(
      shouldRefreshAndRetry({
        skipAuthRefresh: false,
        error: new Error('network'),
      }),
    ).toBe(false);
  });
});
