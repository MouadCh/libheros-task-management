import {
  buildAppUrl,
  DEFAULT_API_PORT,
  DEFAULT_APP_HOST,
  DEFAULT_WEB_PORT,
  parseCorsOrigins,
} from '@libheros/contracts';
import { registerAs } from '@nestjs/config';
import type { AppConfig } from './app-config.types';

export const APP_CONFIG_KEY = 'app';

export default registerAs(APP_CONFIG_KEY, (): AppConfig => {
  const host = process.env.APP_HOST ?? DEFAULT_APP_HOST;
  const apiPort = Number(process.env.API_PORT ?? DEFAULT_API_PORT);
  const webPort = Number(process.env.WEB_PORT ?? DEFAULT_WEB_PORT);
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? buildAppUrl({ host, port: webPort });

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    host,
    apiPort,
    webPort,
    frontendOrigin,
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS, [frontendOrigin]),
    databaseUrl: process.env.DATABASE_URL!,
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    cookieSecure: process.env.COOKIE_SECURE === 'true',
  };
});
