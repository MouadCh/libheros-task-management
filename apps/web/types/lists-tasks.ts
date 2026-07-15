import type { TaskStatus } from '@libheros/contracts';

export interface CreateListPayload {
  name: string;
}

export interface CreateTaskPayload {
  shortDescription: string;
  longDescription?: string;
  dueDate: string;
}

export interface UpdateTaskPayload {
  shortDescription?: string;
  longDescription?: string | null;
  dueDate?: string;
}

export interface UpdateTaskStatusPayload {
  status?: TaskStatus;
  completed?: boolean;
}
