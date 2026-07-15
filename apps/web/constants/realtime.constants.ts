/**
 * Runtime realtime constants for the web app.
 * Contracts expose the same values; Vite cannot reliably import CJS value
 * bindings from `@libheros/contracts` during Nuxt client builds.
 */
export const WS_AUTH_TOKEN_KEY = 'token' as const;

export const WS_CLIENT_EVENTS = {
  LIST_JOIN: 'list:join',
  LIST_LEAVE: 'list:leave',
} as const;

export const WS_SERVER_EVENTS = {
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_COMPLETED: 'task:completed',
  LIST_CREATED: 'list:created',
  LIST_DELETED: 'list:deleted',
} as const;

export const WS_TRANSPORT = 'websocket' as const;

/** Socket.IO ack timeout for list join/leave. */
export const WS_ACK_TIMEOUT_MS = 10_000;

export const REALTIME_TEST_IDS = {
  listA: 'list-a',
  listB: 'list-b',
  listC: 'list-c',
  taskA: 'task-a',
  taskB: 'task-b',
  accessToken: 'test-access-token',
  refreshedToken: 'refreshed-access-token',
  wsUrl: 'http://localhost:3001',
} as const;
