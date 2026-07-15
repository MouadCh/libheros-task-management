import type {
  AuthResponse,
  LoginPayload,
  RefreshResponse,
  RegisterPayload,
  UserDto,
} from '@libheros/contracts';
import { AuthApiRoutes } from '../constants/api.routes';
import { AUTH_REQUEST_TIMEOUT_MS } from '../constants/auth.constants';
import { shouldRefreshAndRetry } from '../utils/auth-retry';
import { getAccessToken, refreshAccessToken } from '../utils/auth-session';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: Record<string, unknown> | object;
  skipAuthRefresh?: boolean;
  headers?: Record<string, string>;
}

/**
 * AUTH_ACCESS_TOKEN_EXPIRED is returned by the JWT guard before handlers run,
 * so a single retry after refresh is safe for that specific 401 (including
 * mutations). Other auth failures are not retried. General transport failures
 * still require server-side idempotency for unsafe methods.
 */
export function useApiClient() {
  const config = useRuntimeConfig();

  function buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      ...extra,
    };

    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  function createTimeoutSignal(): AbortSignal {
    return AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS);
  }

  async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const { skipAuthRefresh = false, headers, method, body } = options;
    const baseURL = String(config.public.apiBaseUrl);

    try {
      return await $fetch<T>(path, {
        baseURL,
        credentials: 'include',
        method,
        body,
        headers: buildHeaders(headers),
        signal: createTimeoutSignal(),
      });
    } catch (error) {
      if (
        !shouldRefreshAndRetry({
          skipAuthRefresh,
          error,
        })
      ) {
        throw error;
      }

      await refreshAccessToken();

      return await $fetch<T>(path, {
        baseURL,
        credentials: 'include',
        method,
        body,
        headers: buildHeaders(headers),
        signal: createTimeoutSignal(),
      });
    }
  }

  function register(payload: RegisterPayload): Promise<AuthResponse> {
    return apiFetch<AuthResponse>(AuthApiRoutes.register, {
      method: 'POST',
      body: payload,
      skipAuthRefresh: true,
    });
  }

  function login(payload: LoginPayload): Promise<AuthResponse> {
    return apiFetch<AuthResponse>(AuthApiRoutes.login, {
      method: 'POST',
      body: payload,
      skipAuthRefresh: true,
    });
  }

  function refresh(): Promise<RefreshResponse> {
    return apiFetch<RefreshResponse>(AuthApiRoutes.refresh, {
      method: 'POST',
      skipAuthRefresh: true,
    });
  }

  function logout(): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(AuthApiRoutes.logout, {
      method: 'POST',
      skipAuthRefresh: true,
    });
  }

  function me(options: { skipAuthRefresh?: boolean } = {}): Promise<UserDto> {
    return apiFetch<UserDto>(AuthApiRoutes.me, {
      method: 'GET',
      skipAuthRefresh: options.skipAuthRefresh ?? false,
    });
  }

  return {
    apiFetch,
    register,
    login,
    refresh,
    logout,
    me,
  };
}
