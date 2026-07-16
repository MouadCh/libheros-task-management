/**
 * Coordinates refresh token rotation across concurrent callers and browser tabs.
 * Server refresh cookies are single-use — overlapping refreshes can revoke sessions.
 */

const REFRESH_LOCK = 'libheros-auth-refresh';
const CHANNEL_NAME = 'libheros-auth';

type AccessTokenListener = (token: string) => void;

let inFlight: Promise<string> | null = null;
let channel: BroadcastChannel | null = null;
const listeners = new Set<AccessTokenListener>();

function getChannel(): BroadcastChannel | null {
  if (!import.meta.client || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; accessToken?: string } | null;
      if (data?.type !== 'access-token' || typeof data.accessToken !== 'string') {
        return;
      }
      for (const listener of listeners) {
        listener(data.accessToken);
      }
    };
  }
  return channel;
}

export function subscribeAccessTokenBroadcast(listener: AccessTokenListener): () => void {
  getChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function broadcastAccessToken(accessToken: string): void {
  getChannel()?.postMessage({ type: 'access-token', accessToken });
}

async function withBrowserLock<T>(run: () => Promise<T>): Promise<T> {
  if (import.meta.client && typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(REFRESH_LOCK, run);
  }
  return run();
}

/**
 * Runs `fetcher` under a process-wide single-flight and (when available) a
 * cross-tab Web Lock so only one refresh HTTP call happens at a time.
 */
export async function runExclusiveRefresh(fetcher: () => Promise<string>): Promise<string> {
  if (inFlight) {
    return inFlight;
  }

  inFlight = withBrowserLock(fetcher).finally(() => {
    inFlight = null;
  });

  return inFlight;
}
