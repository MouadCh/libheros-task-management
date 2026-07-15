import {
  buildAppUrl,
  DEFAULT_APP_HOST,
  DEFAULT_WEB_PORT,
  parseCorsOrigins,
} from '@libheros/contracts';

export function getWebSocketCorsOrigins(): string[] {
  const host = process.env.APP_HOST ?? DEFAULT_APP_HOST;
  const webPort = Number(process.env.WEB_PORT ?? DEFAULT_WEB_PORT);
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? buildAppUrl({ host, port: webPort });

  return [...parseCorsOrigins(process.env.CORS_ORIGINS, [frontendOrigin])];
}
