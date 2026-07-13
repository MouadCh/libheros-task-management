import type { Response } from 'express';
import type { AppConfigService } from '../../common/config/app-config.service';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const REFRESH_TOKEN_COOKIE_PATH = '/api/auth';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function setRefreshTokenCookie(
  res: Response,
  token: string,
  appConfig: AppConfigService,
): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: appConfig.cookieSecure,
    path: REFRESH_TOKEN_COOKIE_PATH,
    maxAge: SEVEN_DAYS_MS,
  });
}

export function clearRefreshTokenCookie(res: Response, appConfig: AppConfigService): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: appConfig.cookieSecure,
    path: REFRESH_TOKEN_COOKIE_PATH,
  });
}
