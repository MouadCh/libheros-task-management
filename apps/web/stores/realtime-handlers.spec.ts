import { beforeEach, describe, expect, it } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import type { TaskDto, TaskListDto } from '@libheros/contracts';
import { TaskStatus } from '../constants/task-status';
import { REALTIME_TEST_IDS } from '../constants/realtime.constants';
import { useListsStore } from './lists';
import { useTasksStore } from './tasks';

function makeList(id: string): TaskListDto {
  return {
    id,
    name: id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

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

describe('lists/tasks realtime apply handlers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('upserts and deletes lists idempotently', () => {
    const store = useListsStore();
    const list = makeList(REALTIME_TEST_IDS.listA);

    store.applyListCreated(list);
    store.applyListCreated({ ...list, name: 'Renamed' });
    store.selectList(REALTIME_TEST_IDS.listA);

    expect(store.lists).toHaveLength(1);
    expect(store.lists[0]?.name).toBe('Renamed');

    store.applyListCreated(makeList(REALTIME_TEST_IDS.listB));
    store.applyListDeleted(REALTIME_TEST_IDS.listA);

    expect(store.lists.map((item) => item.id)).toEqual([REALTIME_TEST_IDS.listB]);
    expect(store.selectedListId).toBe(REALTIME_TEST_IDS.listB);
  });

  it('resets tasks when the active list is deleted remotely', () => {
    const listsStore = useListsStore();
    const tasksStore = useTasksStore();
    listsStore.applyListCreated(makeList(REALTIME_TEST_IDS.listA));
    listsStore.selectList(REALTIME_TEST_IDS.listA);
    tasksStore.listId = REALTIME_TEST_IDS.listA;
    tasksStore.tasks = [makeTask(REALTIME_TEST_IDS.taskA, REALTIME_TEST_IDS.listA)];

    listsStore.applyListDeleted(REALTIME_TEST_IDS.listA);

    expect(tasksStore.listId).toBeNull();
    expect(tasksStore.tasks).toEqual([]);
  });

  it('applies task events only for the active list', () => {
    const store = useTasksStore();
    store.listId = REALTIME_TEST_IDS.listA;
    store.selectTask(REALTIME_TEST_IDS.taskA);
    store.applyTaskCreated({
      listId: REALTIME_TEST_IDS.listA,
      task: makeTask(REALTIME_TEST_IDS.taskA, REALTIME_TEST_IDS.listA),
      occurredAt: '2026-01-01T00:00:00.000Z',
    });

    store.applyTaskUpdated({
      listId: REALTIME_TEST_IDS.listB,
      task: makeTask(REALTIME_TEST_IDS.taskB, REALTIME_TEST_IDS.listB),
      occurredAt: '2026-01-01T00:00:00.000Z',
    });
    expect(store.tasks).toHaveLength(1);

    store.applyTaskCompleted({
      listId: REALTIME_TEST_IDS.listA,
      taskId: REALTIME_TEST_IDS.taskA,
      status: TaskStatus.COMPLETED,
      completedAt: '2026-01-02T00:00:00.000Z',
      occurredAt: '2026-01-02T00:00:00.000Z',
    });
    expect(store.tasks[0]?.status).toBe(TaskStatus.COMPLETED);

    store.applyTaskDeleted({
      listId: REALTIME_TEST_IDS.listA,
      taskId: REALTIME_TEST_IDS.taskA,
      occurredAt: '2026-01-03T00:00:00.000Z',
    });
    expect(store.tasks).toEqual([]);
    expect(store.selectedTaskId).toBeNull();
  });
});
