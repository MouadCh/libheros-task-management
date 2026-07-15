import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { LoginPayload, RegisterPayload, UserDto } from '@libheros/contracts';
import { navigateTo } from 'nuxt/app';
import { useApiClient } from '../composables/useApiClient';
import { useRealtime } from '../composables/useRealtime';
import { AppRoutes } from '../constants/api.routes';
import { isUnauthorizedAuthFailure } from '../utils/auth-errors';
import {
  accessToken,
  clearSession as clearAuthSession,
  registerAuthRefreshHandler,
  setAccessToken,
  setSession as setAuthSession,
  setUser,
  user,
} from '../utils/auth-session';

type AuthStatus = 'idle' | 'bootstrapping' | 'ready' | 'error';

export const useAuthStore = defineStore('auth', () => {
  const status = ref<AuthStatus>('idle');
  const bootstrapPromise = ref<Promise<void> | null>(null);
  const refreshPromise = ref<Promise<string> | null>(null);
  const bootstrapGeneration = ref(0);

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value));
  const isReady = computed(() => status.value === 'ready');
  const hasBootstrapError = computed(() => status.value === 'error');

  function invalidateBootstrap(): void {
    bootstrapGeneration.value += 1;
  }

  function setSession(token: string, nextUser: UserDto): void {
    invalidateBootstrap();
    setAuthSession(token, nextUser);
    status.value = 'ready';
  }

  function clearSessionLocal(): void {
    clearAuthSession();
  }

  async function clearSessionAndRedirectToLogin(): Promise<void> {
    const { disconnect } = useRealtime();
    disconnect();
    invalidateBootstrap();
    clearSessionLocal();
    status.value = 'idle';

    if (import.meta.client) {
      await navigateTo(AppRoutes.login);
    }
  }

  async function bootstrap(): Promise<void> {
    if (status.value === 'ready') {
      return;
    }

    if (bootstrapPromise.value) {
      return bootstrapPromise.value;
    }

    const generation = bootstrapGeneration.value + 1;
    bootstrapGeneration.value = generation;
    status.value = 'bootstrapping';

    bootstrapPromise.value = (async () => {
      try {
        const api = useApiClient();
        const refreshResponse = await api.refresh();

        if (generation !== bootstrapGeneration.value) {
          return;
        }

        setAccessToken(refreshResponse.accessToken);

        try {
          // skipAuthRefresh avoids nested refreshSession while this flight owns state.
          const profile = await api.me({ skipAuthRefresh: true });

          if (generation !== bootstrapGeneration.value) {
            return;
          }

          setUser(profile);
          status.value = 'ready';
        } catch (meError) {
          if (generation !== bootstrapGeneration.value) {
            return;
          }

          // Incomplete session: never leave a token without a user as "soft auth".
          clearSessionLocal();

          if (isUnauthorizedAuthFailure(meError)) {
            status.value = 'ready';
            return;
          }

          status.value = 'error';
        }
      } catch (error) {
        if (generation !== bootstrapGeneration.value) {
          return;
        }

        // Login/register may have established a session while refresh was in flight.
        if (accessToken.value && user.value) {
          status.value = 'ready';
          return;
        }

        clearSessionLocal();

        if (isUnauthorizedAuthFailure(error)) {
          status.value = 'ready';
          return;
        }

        status.value = 'error';
      } finally {
        bootstrapPromise.value = null;
      }
    })();

    return bootstrapPromise.value;
  }

  async function waitUntilReady(): Promise<void> {
    if (isReady.value) {
      return;
    }

    if (bootstrapPromise.value) {
      await bootstrapPromise.value;
    }

    if (isReady.value) {
      return;
    }

    const currentStatus = status.value;
    if (currentStatus === 'idle' || currentStatus === 'error') {
      await bootstrap();
    }
  }

  async function retryBootstrap(): Promise<void> {
    if (bootstrapPromise.value) {
      await bootstrapPromise.value;
    }

    invalidateBootstrap();
    clearSessionLocal();
    status.value = 'idle';
    await bootstrap();
  }

  async function register(payload: RegisterPayload): Promise<void> {
    const api = useApiClient();
    const response = await api.register(payload);
    setSession(response.accessToken, response.user);
  }

  async function login(payload: LoginPayload): Promise<void> {
    const api = useApiClient();
    const response = await api.login(payload);
    setSession(response.accessToken, response.user);
  }

  async function logout(): Promise<void> {
    const api = useApiClient();

    try {
      await api.logout();
    } catch {
      // Best-effort: always clear local session even if the cookie cannot be revoked.
    } finally {
      await clearSessionAndRedirectToLogin();
    }
  }

  async function refreshSession(): Promise<string> {
    if (refreshPromise.value) {
      return refreshPromise.value;
    }

    refreshPromise.value = (async () => {
      try {
        const api = useApiClient();
        const response = await api.refresh();
        setAccessToken(response.accessToken);

        if (!user.value) {
          // Must not re-enter refreshSession via apiFetch refresh-on-401.
          setUser(await api.me({ skipAuthRefresh: true }));
        }

        status.value = 'ready';
        return response.accessToken;
      } catch (error) {
        await clearSessionAndRedirectToLogin();
        throw error;
      } finally {
        refreshPromise.value = null;
      }
    })();

    return refreshPromise.value;
  }

  registerAuthRefreshHandler(refreshSession);

  return {
    accessToken,
    user,
    status,
    isAuthenticated,
    isReady,
    hasBootstrapError,
    bootstrap,
    waitUntilReady,
    retryBootstrap,
    register,
    login,
    logout,
    refreshSession,
    clearSessionAndRedirectToLogin,
  };
});
