import type { FetchError } from 'ofetch';
import {
  AUTH_UNAUTHORIZED_CODE,
  AUTH_INVALID_TOKEN_CODE,
  AUTH_ACCESS_TOKEN_EXPIRED_CODE,
} from '../constants/auth.constants';
import { getApiErrorFromUnknown } from './api-error';

const AUTH_FAILURE_CODES = new Set([
  AUTH_UNAUTHORIZED_CODE,
  AUTH_INVALID_TOKEN_CODE,
  AUTH_ACCESS_TOKEN_EXPIRED_CODE,
]);

export function isUnauthorizedAuthFailure(error: unknown): boolean {
  const apiError = getApiErrorFromUnknown(error);

  if (apiError) {
    return AUTH_FAILURE_CODES.has(apiError.code);
  }

  const statusCode =
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as FetchError).statusCode === 'number'
      ? (error as FetchError).statusCode
      : undefined;

  // Bare 401 without a structured body (proxies, etc.) — treat as auth failure.
  return statusCode === 401;
}
