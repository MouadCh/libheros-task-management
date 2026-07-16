import { ref, type Ref } from 'vue';
import type { UserDto } from '@libheros/contracts';

/**
 * Shared auth session state used by the Pinia store and the API client.
 * Keeps the client from importing the store (avoids a circular dependency).
 *
 * Refresh rotation is single-flight + Web Locks / BroadcastChannel (see
 * `refresh-coordinator.ts`) so tabs share one refresh and sync access tokens.
 * List/task sync across tabs uses Socket.IO rooms — not this module.
 */
export const accessToken: Ref<string | null> = ref(null);
export const user: Ref<UserDto | null> = ref(null);

export function getAccessToken(): string | null {
  return accessToken.value;
}

export function setSession(token: string, nextUser: UserDto): void {
  accessToken.value = token;
  user.value = nextUser;
}

export function setAccessToken(token: string): void {
  accessToken.value = token;
}

export function setUser(nextUser: UserDto): void {
  user.value = nextUser;
}

export function clearSession(): void {
  accessToken.value = null;
  user.value = null;
}

type RefreshHandler = () => Promise<string>;

let refreshHandler: RefreshHandler | null = null;

export function registerAuthRefreshHandler(handler: RefreshHandler): void {
  refreshHandler = handler;
}

export async function refreshAccessToken(): Promise<string> {
  if (!refreshHandler) {
    throw new Error('Auth refresh handler is not registered');
  }

  return refreshHandler();
}
