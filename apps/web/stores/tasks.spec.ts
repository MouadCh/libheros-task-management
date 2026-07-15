import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import type { TaskDto } from '@libheros/contracts';
import { TaskStatus } from '../constants/task-status';

const mockApi = {
  listTasks: mock(() => Promise.resolve([] as TaskDto[])),
};

mock.module('../composables/useApiClient', () => ({
  useApiClient: () => mockApi,
}));

function makeTask(id: string, listId: string): TaskDto {
  return {
    id,
    listId,
    shortDescription: id,
    longDescription: null,
    dueDate: '2026-06-01T00:00:00.000Z',
    status: TaskStatus.ACTIVE,
    completedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('useTasksStore fetch race', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockApi.listTasks.mockReset();
  });

  it('ignores a stale listTasks response after a newer fetch starts', async () => {
    const { useTasksStore } = await import('./tasks');
    const store = useTasksStore();

    let resolveFirst!: (value: TaskDto[]) => void;
    let resolveSecond!: (value: TaskDto[]) => void;

    mockApi.listTasks
      .mockImplementationOnce(
        () =>
          new Promise<TaskDto[]>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<TaskDto[]>((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const first = store.fetchTasks('list-a');
    const second = store.fetchTasks('list-b');

    resolveSecond([makeTask('task-b', 'list-b')]);
    await second;

    resolveFirst([makeTask('task-a', 'list-a')]);
    await first;

    expect(store.listId).toBe('list-b');
    expect(store.tasks.map((task) => task.id)).toEqual(['task-b']);
    expect(store.isLoading).toBe(false);
  });

  it('clears loading when a silent fetch wins over an in-flight visible fetch', async () => {
    const { useTasksStore } = await import('./tasks');
    const store = useTasksStore();

    let resolveVisible!: (value: TaskDto[]) => void;
    let resolveSilent!: (value: TaskDto[]) => void;

    mockApi.listTasks
      .mockImplementationOnce(
        () =>
          new Promise<TaskDto[]>((resolve) => {
            resolveVisible = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<TaskDto[]>((resolve) => {
            resolveSilent = resolve;
          }),
      );

    const visible = store.fetchTasks('list-a');
    expect(store.isLoading).toBe(true);

    const silent = store.fetchTasks('list-a', { silent: true, preserveSelection: true });

    resolveSilent([makeTask('task-a', 'list-a')]);
    await silent;

    expect(store.isLoading).toBe(false);

    resolveVisible([makeTask('task-stale', 'list-a')]);
    await visible;

    expect(store.tasks.map((task) => task.id)).toEqual(['task-a']);
    expect(store.isLoading).toBe(false);
  });
});
