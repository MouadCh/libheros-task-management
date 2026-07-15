export const AuthApiRoutes = {
  register: '/auth/register',
  login: '/auth/login',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  me: '/auth/me',
} as const;

export const ListsApiRoutes = {
  base: '/lists',
  byId: (listId: string) => `/lists/${listId}`,
  tasks: (listId: string) => `/lists/${listId}/tasks`,
} as const;

export const TasksApiRoutes = {
  byId: (taskId: string) => `/tasks/${taskId}`,
  status: (taskId: string) => `/tasks/${taskId}/status`,
} as const;

export const AppRoutes = {
  home: '/',
  login: '/login',
} as const;
