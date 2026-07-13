export const DEFAULT_APP_HOST = 'localhost';
export const DEFAULT_API_PORT = 3001;
export const DEFAULT_WEB_PORT = 3000;

export interface BuildAppUrlOptions {
  host?: string;
  port: number | string;
  path?: string;
  protocol?: 'http' | 'https';
}

export function buildAppUrl(options: BuildAppUrlOptions): string {
  const protocol = options.protocol ?? 'http';
  const host = options.host ?? DEFAULT_APP_HOST;
  const path = options.path
    ? options.path.startsWith('/')
      ? options.path
      : `/${options.path}`
    : '';

  return `${protocol}://${host}:${options.port}${path}`;
}

export function parseCorsOrigins(value: string | undefined, fallback: string[]): string[] {
  if (!value?.trim()) {
    return fallback;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
