export enum TaskStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDto {
  id: string;
  listId: string;
  shortDescription: string;
  longDescription: string | null;
  dueDate: string;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

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

export interface ListJoinPayload {
  listId: string;
}

export interface ListLeavePayload {
  listId: string;
}

export interface TaskCreatedPayload {
  listId: string;
  task: TaskDto;
  occurredAt: string;
}

export interface TaskUpdatedPayload {
  listId: string;
  task: TaskDto;
  occurredAt: string;
}

export interface TaskDeletedPayload {
  listId: string;
  taskId: string;
  occurredAt: string;
}

export interface TaskCompletedPayload {
  listId: string;
  taskId: string;
  status: TaskStatus;
  completedAt: string | null;
  occurredAt: string;
}

export interface ListCreatedPayload {
  list: TaskListDto;
  occurredAt: string;
}

export interface ListDeletedPayload {
  listId: string;
  occurredAt: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
  path: string;
  requestId: string;
}

export {
  buildAppUrl,
  DEFAULT_API_PORT,
  DEFAULT_APP_HOST,
  DEFAULT_WEB_PORT,
  parseCorsOrigins,
} from './env';
export type { BuildAppUrlOptions } from './env';
