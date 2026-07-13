import type { TaskListDto } from '@libheros/contracts';
import type { TaskList } from '@prisma/client';

export function toTaskListDto(list: TaskList): TaskListDto {
  return {
    id: list.id,
    name: list.name,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  };
}
