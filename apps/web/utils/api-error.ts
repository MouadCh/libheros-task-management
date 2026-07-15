import type { ApiErrorResponse } from '@libheros/contracts';
import { FetchError } from 'ofetch';

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.statusCode === 'number' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string'
  );
}

export function getApiErrorFromUnknown(error: unknown): ApiErrorResponse | null {
  if (!(error instanceof FetchError)) {
    return null;
  }

  return isApiErrorResponse(error.data) ? error.data : null;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return getApiErrorFromUnknown(error)?.message ?? fallback;
}
