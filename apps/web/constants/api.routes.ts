export const AuthApiRoutes = {
  register: '/auth/register',
  login: '/auth/login',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  me: '/auth/me',
} as const;

export const AppRoutes = {
  home: '/',
  login: '/login',
} as const;
