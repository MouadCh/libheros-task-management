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
  <div v-if="showSessionError" class="lh-alert-warn mb-6" role="alert">
    <p>{{ AUTH_SESSION_ERROR_MESSAGE }}</p>
    <button
      type="button"
      class="lh-btn-ghost mt-3"
      :disabled="isRetrying"
      :aria-busy="isRetrying"
      @click="onRetry"
    >
      {{ isRetrying ? 'Retrying…' : 'Retry' }}
    </button>
  </div>
</template>
