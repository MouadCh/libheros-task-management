export const WS_E2E_CONNECT_TIMEOUT_MS = 5_000;
export const WS_E2E_EVENT_TIMEOUT_MS = 5_000;
export const WS_E2E_TRANSPORT = 'websocket' as const;

export const WS_E2E_ERROR_MESSAGES = {
  listenRequired: 'WebSocket e2e tests require the app to listen on a TCP port',
  connectTimeout: 'Timed out waiting for WebSocket connection',
  eventTimeout: (event: string) => `Timed out waiting for WebSocket event "${event}"`,
} as const;
