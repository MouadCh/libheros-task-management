import { useAuthStore } from '~/stores/auth';

export default defineNuxtPlugin(() => {
  if (import.meta.server) {
    return;
  }

  const authStore = useAuthStore();
  void authStore.bootstrap();
});
