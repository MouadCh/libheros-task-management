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

/** Network / abort / 5xx — do not treat as “session dead”. */
export function isTransportFailure(error: unknown): boolean {
  if (isUnauthorizedAuthFailure(error)) {
    return false;
  }

  if (error instanceof TypeError) {
    return true;
  }

  if (typeof error === 'object' && error !== null && 'name' in error) {
    const name = (error as { name?: string }).name;
    if (name === 'AbortError' || name === 'TimeoutError' || name === 'FetchError') {
      return true;
    }
  }

  const statusCode =
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as FetchError).statusCode === 'number'
      ? (error as FetchError).statusCode
      : undefined;

  return typeof statusCode === 'number' && statusCode >= 500;
}
