import type { TaskStatus as TaskStatusValue } from '@libheros/contracts';

/**
 * Runtime status constants for the web app.
 * Contracts expose the same values; Vite cannot reliably import CJS value
 * bindings from `@libheros/contracts` during Nuxt production builds.
 */
export const TaskStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
} as const satisfies Record<string, TaskStatusValue>;
