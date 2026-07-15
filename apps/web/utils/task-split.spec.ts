import { describe, expect, it } from 'bun:test';
import type { TaskDto } from '@libheros/contracts';
import { TaskStatus } from '../constants/task-status';
import { sortTaskDtos, splitTasksByStatus } from './task-split';

function makeTask(partial: Partial<TaskDto> & Pick<TaskDto, 'id' | 'status'>): TaskDto {
  return {
    listId: 'list-1',
    shortDescription: 'Task',
    longDescription: null,
    dueDate: '2026-12-31T12:00:00.000Z',
    completedAt: partial.status === TaskStatus.COMPLETED ? '2026-01-02T00:00:00.000Z' : null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('splitTasksByStatus', () => {
  it('splits active and completed tasks', () => {
    const tasks = [
      makeTask({ id: 'a', status: TaskStatus.ACTIVE }),
      makeTask({ id: 'c', status: TaskStatus.COMPLETED }),
      makeTask({ id: 'b', status: TaskStatus.ACTIVE }),
    ];

    const result = splitTasksByStatus(tasks);

    expect(result.active.map((task) => task.id)).toEqual(['a', 'b']);
    expect(result.completed.map((task) => task.id)).toEqual(['c']);
  });
});

describe('sortTaskDtos', () => {
  it('orders active by dueDate then createdAt, completed by completedAt desc', () => {
    const tasks = [
      makeTask({
        id: 'active-late',
        status: TaskStatus.ACTIVE,
        dueDate: '2026-06-02T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      makeTask({
        id: 'completed-old',
        status: TaskStatus.COMPLETED,
        completedAt: '2026-01-01T00:00:00.000Z',
      }),
      makeTask({
        id: 'active-early',
        status: TaskStatus.ACTIVE,
        dueDate: '2026-06-01T00:00:00.000Z',
        createdAt: '2026-01-02T00:00:00.000Z',
      }),
      makeTask({
        id: 'completed-new',
        status: TaskStatus.COMPLETED,
        completedAt: '2026-01-03T00:00:00.000Z',
      }),
    ];

    expect(sortTaskDtos(tasks).map((task) => task.id)).toEqual([
      'active-early',
      'active-late',
      'completed-new',
      'completed-old',
    ]);
  });
});
