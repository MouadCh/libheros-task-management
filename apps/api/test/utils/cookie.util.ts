import { REFRESH_TOKEN_COOKIE } from '../../src/auth/utils/auth-cookie.util';

export function normalizeSetCookieHeader(setCookieHeader: string | string[] | undefined): string[] {
  if (!setCookieHeader) {
    return [];
  }

  return Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
}

export function getRefreshCookieValue(
  setCookieHeader: string | string[] | undefined,
): string | undefined {
  const cookieHeader = normalizeSetCookieHeader(setCookieHeader).find((value) =>
    value.startsWith(`${REFRESH_TOKEN_COOKIE}=`),
  );
  if (!cookieHeader) {
    return undefined;
  }

  return cookieHeader.split(';')[0]?.split('=')[1];
}
