import type { TaskDto } from '@libheros/contracts';
import { TaskStatus } from '../constants/task-status';

/** Mirrors server-side sortTasksForList ordering for TaskDto. */
export function sortTaskDtos(tasks: readonly TaskDto[]): TaskDto[] {
  const active = tasks
    .filter((task) => task.status === TaskStatus.ACTIVE)
    .sort((left, right) => {
      const dueDateCompare = Date.parse(left.dueDate) - Date.parse(right.dueDate);
      if (dueDateCompare !== 0) {
        return dueDateCompare;
      }
      return Date.parse(left.createdAt) - Date.parse(right.createdAt);
    });

  const completed = tasks
    .filter((task) => task.status === TaskStatus.COMPLETED)
    .sort((left, right) => {
      const leftCompletedAt = left.completedAt ? Date.parse(left.completedAt) : 0;
      const rightCompletedAt = right.completedAt ? Date.parse(right.completedAt) : 0;
      return rightCompletedAt - leftCompletedAt;
    });

  return [...active, ...completed];
}

export function splitTasksByStatus(tasks: readonly TaskDto[]): {
  active: TaskDto[];
  completed: TaskDto[];
} {
  const active: TaskDto[] = [];
  const completed: TaskDto[] = [];

  for (const task of tasks) {
    if (task.status === TaskStatus.COMPLETED) {
      completed.push(task);
    } else {
      active.push(task);
    }
  }

  return { active, completed };
}
