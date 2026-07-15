import { AUTH_ACCESS_TOKEN_EXPIRED_CODE } from '../constants/auth.constants';
import { getApiErrorFromUnknown } from './api-error';

/**
 * True when the JWT guard rejected the request before any handler ran
 * (AUTH_ACCESS_TOKEN_EXPIRED). A single retry after refresh is then safe
 * even for mutations, because the original attempt had no side effects.
 */
export function shouldRefreshAndRetry(options: {
  skipAuthRefresh: boolean;
  error: unknown;
}): boolean {
  if (options.skipAuthRefresh) {
    return false;
  }

  const apiError = getApiErrorFromUnknown(options.error);
  return apiError?.code === AUTH_ACCESS_TOKEN_EXPIRED_CODE;
}
