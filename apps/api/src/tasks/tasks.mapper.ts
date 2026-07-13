import type { TaskStatus, TaskDto } from '@libheros/contracts';
import type { Task } from '@prisma/client';

export function toTaskDto(task: Task): TaskDto {
  return {
    id: task.id,
    listId: task.listId,
    shortDescription: task.shortDescription,
    longDescription: task.longDescription,
    dueDate: task.dueDate.toISOString(),
    status: task.status as TaskStatus,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function sortTasksForList(tasks: Task[]): Task[] {
  const active = tasks
    .filter((task) => task.status === 'ACTIVE')
    .sort((left, right) => {
      const dueDateCompare = left.dueDate.getTime() - right.dueDate.getTime();
      if (dueDateCompare !== 0) {
        return dueDateCompare;
      }
      return left.createdAt.getTime() - right.createdAt.getTime();
    });

  const completed = tasks
    .filter((task) => task.status === 'COMPLETED')
    .sort((left, right) => {
      const leftCompletedAt = left.completedAt?.getTime() ?? 0;
      const rightCompletedAt = right.completedAt?.getTime() ?? 0;
      return rightCompletedAt - leftCompletedAt;
    });

  return [...active, ...completed];
}
