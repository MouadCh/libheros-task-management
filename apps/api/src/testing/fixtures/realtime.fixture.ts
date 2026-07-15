import type { ListJoinPayload, ListLeavePayload } from '@libheros/contracts';
import type { UpdateTaskStatusDto } from '../../tasks/dto/update-task-status.dto';

export const realtimeTestData = {
  invalidAccessToken: 'invalid-access-token',
  eventPropagationGraceMs: 300,
} as const;

export const taskStatusTestPayloads = {
  complete: { completed: true },
  restore: { completed: false },
} as const satisfies Record<string, UpdateTaskStatusDto>;

export function buildListJoinPayload(listId: string): ListJoinPayload {
  return { listId };
}

export function buildListLeavePayload(listId: string): ListLeavePayload {
  return { listId };
}
