import { AppRoutes } from '~/constants/api.routes';
import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return;
  }

  const authStore = useAuthStore();
  await authStore.waitUntilReady();

  // Recoverable bootstrap failure: stay on login so the user can retry.
  if (authStore.hasBootstrapError) {
    return;
  }

  if (authStore.isAuthenticated) {
    return navigateTo(AppRoutes.home);
  }
});
