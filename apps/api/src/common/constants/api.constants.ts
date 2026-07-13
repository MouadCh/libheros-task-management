export const API_GLOBAL_PREFIX = 'api';

function buildApiPath(...segments: string[]): string {
  return `/${[API_GLOBAL_PREFIX, ...segments].join('/')}`;
}

export const ApiRoutes = {
  health: () => buildApiPath('health'),
  auth: {
    base: () => buildApiPath('auth'),
    register: () => buildApiPath('auth', 'register'),
    login: () => buildApiPath('auth', 'login'),
    refresh: () => buildApiPath('auth', 'refresh'),
    logout: () => buildApiPath('auth', 'logout'),
    me: () => buildApiPath('auth', 'me'),
  },
} as const;
