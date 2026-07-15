import { watch } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useListsStore } from '~/stores/lists';
import { useRealtime } from '~/composables/useRealtime';
import { accessToken } from '~/utils/auth-session';

/**
 * Keeps the Socket.IO client aligned with auth session and list selection.
 * Domain multi-tab sync uses gateway rooms; each tab maintains its own socket.
 */
export default defineNuxtPlugin(() => {
  if (import.meta.server) {
    return;
  }

  const authStore = useAuthStore();
  const listsStore = useListsStore();
  const realtime = useRealtime();

  watch(
    () => ({
      ready: authStore.isReady,
      authenticated: authStore.isAuthenticated,
      token: accessToken.value,
    }),
    ({ ready, authenticated, token }) => {
      if (ready && authenticated && token) {
        realtime.connect();
        realtime.syncListRoom(listsStore.selectedListId);
        return;
      }

      realtime.disconnect();
    },
    { immediate: true },
  );

  watch(
    () => listsStore.selectedListId,
    (listId) => {
      if (!authStore.isAuthenticated || !authStore.isReady) {
        return;
      }

      realtime.syncListRoom(listId);
    },
  );
});
