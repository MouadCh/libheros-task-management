import { AppRoutes } from '~/constants/api.routes';
import {
  AUTH_SESSION_ERROR_QUERY,
  AUTH_SESSION_ERROR_QUERY_VALUE,
} from '~/constants/auth.constants';
import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return;
  }

  const authStore = useAuthStore();
  await authStore.waitUntilReady();

  if (authStore.hasBootstrapError) {
    return navigateTo({
      path: AppRoutes.login,
      query: { [AUTH_SESSION_ERROR_QUERY]: AUTH_SESSION_ERROR_QUERY_VALUE },
    });
  }

  if (!authStore.isAuthenticated) {
    return navigateTo(AppRoutes.login);
  }
});
