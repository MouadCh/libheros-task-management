<script setup lang="ts">
import {
  AUTH_SESSION_ERROR_MESSAGE,
  AUTH_SESSION_ERROR_QUERY,
  AUTH_SESSION_ERROR_QUERY_VALUE,
} from '~/constants/auth.constants';
import { useAuthStore } from '~/stores/auth';
import { AppRoutes } from '~/constants/api.routes';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const isRetrying = ref(false);

const showSessionError = computed(
  () =>
    authStore.hasBootstrapError ||
    route.query[AUTH_SESSION_ERROR_QUERY] === AUTH_SESSION_ERROR_QUERY_VALUE,
);

async function onRetry(): Promise<void> {
  isRetrying.value = true;

  try {
    await authStore.retryBootstrap();

    if (authStore.isAuthenticated) {
      await navigateTo(AppRoutes.home);
      return;
    }

    if (!authStore.hasBootstrapError) {
      const nextQuery = { ...route.query };
      delete nextQuery[AUTH_SESSION_ERROR_QUERY];
      await router.replace({ query: nextQuery });
    }
  } finally {
    isRetrying.value = false;
  }
}
</script>

<template>
  <div
    v-if="showSessionError"
    class="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900"
    role="alert"
  >
    <p>{{ AUTH_SESSION_ERROR_MESSAGE }}</p>
    <button
      type="button"
      class="mt-3 inline-flex items-center justify-center rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-950 transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 disabled:opacity-60"
      :disabled="isRetrying"
      :aria-busy="isRetrying"
      @click="onRetry"
    >
      {{ isRetrying ? 'Retrying…' : 'Retry' }}
    </button>
  </div>
</template>
