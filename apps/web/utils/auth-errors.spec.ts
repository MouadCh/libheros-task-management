import { describe, expect, it } from 'bun:test';
import { FetchError } from 'ofetch';
import type { ApiErrorResponse } from '@libheros/contracts';
import {
  AUTH_ACCESS_TOKEN_EXPIRED_CODE,
  AUTH_INVALID_TOKEN_CODE,
  AUTH_UNAUTHORIZED_CODE,
} from '../constants/auth.constants';
import { isUnauthorizedAuthFailure } from './auth-errors';

function createApiFetchError(
  partial: Partial<ApiErrorResponse> & Pick<ApiErrorResponse, 'code' | 'statusCode'>,
): FetchError {
  const error = new FetchError('request failed');
  error.statusCode = partial.statusCode;
  error.data = {
    statusCode: partial.statusCode,
    code: partial.code,
    message: partial.message ?? 'error',
    timestamp: partial.timestamp ?? new Date().toISOString(),
    path: partial.path ?? '/auth/refresh',
    requestId: partial.requestId ?? 'req-1',
  } satisfies ApiErrorResponse;
  return error;
}

describe('isUnauthorizedAuthFailure', () => {
  it('returns true for known AUTH_* codes', () => {
    expect(
      isUnauthorizedAuthFailure(
        createApiFetchError({ statusCode: 401, code: AUTH_UNAUTHORIZED_CODE }),
      ),
    ).toBe(true);
    expect(
      isUnauthorizedAuthFailure(
        createApiFetchError({ statusCode: 401, code: AUTH_INVALID_TOKEN_CODE }),
      ),
    ).toBe(true);
    expect(
      isUnauthorizedAuthFailure(
        createApiFetchError({ statusCode: 401, code: AUTH_ACCESS_TOKEN_EXPIRED_CODE }),
      ),
    ).toBe(true);
  });

  it('returns false for structured non-auth 401 codes', () => {
    expect(
      isUnauthorizedAuthFailure(createApiFetchError({ statusCode: 401, code: 'VALIDATION_ERROR' })),
    ).toBe(false);
  });

  it('returns true for bare 401 without structured body', () => {
    const error = new FetchError('unauthorized');
    error.statusCode = 401;
    expect(isUnauthorizedAuthFailure(error)).toBe(true);
  });

  it('returns false for network errors', () => {
    expect(isUnauthorizedAuthFailure(new Error('network'))).toBe(false);
  });
});
