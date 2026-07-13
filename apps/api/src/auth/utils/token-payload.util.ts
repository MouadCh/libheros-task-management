import { randomUUID } from 'crypto';

export interface AccessTokenPayload {
  sub: string;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  jti: string;
}

export function createRefreshTokenPayload(userId: string, sessionId: string): RefreshTokenPayload {
  return {
    sub: userId,
    sid: sessionId,
    jti: randomUUID(),
  };
}

export function getRefreshTokenExpiry(exp: number): Date {
  return new Date(exp * 1000);
}

export function getRefreshTokenExpiryFromDecoded(decoded: string | null | { exp?: unknown }): Date {
  if (!decoded || typeof decoded === 'string' || typeof decoded.exp !== 'number') {
    throw new Error('Invalid refresh token payload');
  }

  return getRefreshTokenExpiry(decoded.exp);
}
