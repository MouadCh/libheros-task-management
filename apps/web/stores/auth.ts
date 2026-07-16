import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { LoginPayload, RegisterPayload, UserDto } from '@libheros/contracts';
import { navigateTo } from 'nuxt/app';
import { useApiClient } from '../composables/useApiClient';
import { useRealtime } from '../composables/useRealtime';
import { AppRoutes } from '../constants/api.routes';
import { isTransportFailure, isUnauthorizedAuthFailure } from '../utils/auth-errors';
import {
  accessToken,
  clearSession as clearAuthSession,
  registerAuthRefreshHandler,
  setAccessToken,
  setSession as setAuthSession,
  setUser,
  user,
} from '../utils/auth-session';
import {
  broadcastAccessToken,
  runExclusiveRefresh,
  subscribeAccessTokenBroadcast,
} from '../utils/refresh-coordinator';

type AuthStatus = 'idle' | 'bootstrapping' | 'ready' | 'error';

export const useAuthStore = defineStore('auth', () => {
  const status = ref<AuthStatus>('idle');
  const bootstrapPromise = ref<Promise<void> | null>(null);
  const bootstrapGeneration = ref(0);

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value));
  const isReady = computed(() => status.value === 'ready');
  const hasBootstrapError = computed(() => status.value === 'error');

  if (import.meta.client) {
    subscribeAccessTokenBroadcast((token) => {
      setAccessToken(token);
    });
  }

  function invalidateBootstrap(): void {
    bootstrapGeneration.value += 1;
  }

  function setSession(token: string, nextUser: UserDto): void {
    invalidateBootstrap();
    setAuthSession(token, nextUser);
    status.value = 'ready';
    broadcastAccessToken(token);
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

  /** HTTP refresh only — single-flight + cross-tab lock; does not mutate session. */
  async function fetchRotatedAccessToken(): Promise<string> {
    return runExclusiveRefresh(async () => {
      const api = useApiClient();
      const response = await api.refresh();
      return response.accessToken;
    });
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
        const rotatedToken = await fetchRotatedAccessToken();

        if (generation !== bootstrapGeneration.value) {
          return;
        }

        setAccessToken(rotatedToken);
        broadcastAccessToken(rotatedToken);

        try {
          // skipAuthRefresh avoids nested refreshSession while this flight owns state.
          const api = useApiClient();
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
    try {
      const rotatedToken = await fetchRotatedAccessToken();
      setAccessToken(rotatedToken);
      broadcastAccessToken(rotatedToken);

      if (!user.value) {
        // Must not re-enter refreshSession via apiFetch refresh-on-401.
        const api = useApiClient();
        setUser(await api.me({ skipAuthRefresh: true }));
      }

      status.value = 'ready';
      return rotatedToken;
    } catch (error) {
      // Transient network/5xx: keep current session and let the caller retry.
      if (isTransportFailure(error) && accessToken.value && user.value) {
        throw error;
      }

      await clearSessionAndRedirectToLogin();
      throw error;
    }
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
