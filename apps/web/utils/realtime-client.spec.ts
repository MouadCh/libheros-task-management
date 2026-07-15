import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import type { TaskDto, TaskListDto } from '@libheros/contracts';
import { TaskStatus } from '../constants/task-status';
import {
  REALTIME_TEST_IDS,
  WS_AUTH_TOKEN_KEY,
  WS_CLIENT_EVENTS,
  WS_SERVER_EVENTS,
} from '../constants/realtime.constants';
import { clearSession, setAccessToken } from '../utils/auth-session';

type Handler = (...args: unknown[]) => void;
type AckCallback = (err: Error | null, response: unknown) => void;

type EmittedEvent = {
  event: string;
  payload: { listId: string };
};

type MockSocket = {
  auth: Record<string, string>;
  connected: boolean;
  on: ReturnType<typeof mock>;
  emit: ReturnType<typeof mock>;
  timeout: ReturnType<typeof mock>;
  disconnect: ReturnType<typeof mock>;
  connect: ReturnType<typeof mock>;
  removeAllListeners: ReturnType<typeof mock>;
  handlers: Map<string, Handler[]>;
  emitted: EmittedEvent[];
  pendingAcks: Array<{
    event: string;
    payload: { listId: string };
    ack: AckCallback;
  }>;
  autoAck: boolean;
  trigger: (event: string, ...args: unknown[]) => void;
  flushAck: (index?: number, response?: unknown, err?: Error | null) => void;
};

const mockApi = {
  listTasks: mock(() => Promise.resolve([] as TaskDto[])),
};

mock.module('../composables/useApiClient', () => ({
  useApiClient: () => mockApi,
}));

function createMockSocket(): MockSocket {
  const handlers = new Map<string, Handler[]>();

  const socket: MockSocket = {
    auth: {},
    connected: false,
    handlers,
    emitted: [],
    pendingAcks: [],
    autoAck: true,
    on: mock((event: string, handler: Handler) => {
      const existing = handlers.get(event) ?? [];
      existing.push(handler);
      handlers.set(event, existing);
      return socket;
    }),
    emit: mock(() => socket),
    timeout: mock(() => ({
      emit: (event: string, payload: { listId: string }, ack: AckCallback) => {
        socket.emitted.push({ event, payload });
        if (socket.autoAck) {
          ack(null, { success: true });
        } else {
          socket.pendingAcks.push({ event, payload, ack });
        }
        return socket;
      },
    })),
    disconnect: mock(() => {
      socket.connected = false;
      socket.trigger('disconnect');
      return socket;
    }),
    connect: mock(() => {
      socket.connected = true;
      socket.trigger('connect');
      return socket;
    }),
    removeAllListeners: mock(() => {
      handlers.clear();
      return socket;
    }),
    trigger(event: string, ...args: unknown[]) {
      for (const handler of handlers.get(event) ?? []) {
        handler(...args);
      }
    },
    flushAck(index = 0, response: unknown = { success: true }, err: Error | null = null) {
      const pending = socket.pendingAcks.splice(index, 1)[0];
      if (!pending) {
        throw new Error('No pending ack');
      }
      pending.ack(err, response);
    },
  };

  return socket;
}

let latestSocket: MockSocket | null = null;
const createSocket = mock((_url: string, options: { auth: Record<string, string> }) => {
  const socket = createMockSocket();
  socket.auth = options.auth;
  socket.connected = true;
  latestSocket = socket;
  queueMicrotask(() => {
    socket.trigger('connect');
  });
  return socket;
});

mock.module('socket.io-client', () => ({
  io: createSocket,
}));

function makeList(id: string, name = id): TaskListDto {
  return {
    id,
    name,
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

async function flushRoomSync(): Promise<void> {
  const { __flushRealtimeRoomSyncForTests } = await import('../utils/realtime-client');
  await __flushRealtimeRoomSyncForTests();
  await Promise.resolve();
}

async function waitForPendingAcks(count: number): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if ((latestSocket?.pendingAcks.length ?? 0) >= count) {
      return;
    }
    await Promise.resolve();
  }

  throw new Error(`Timed out waiting for ${count} pending ack(s)`);
}

describe('realtime-client', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    clearSession();
    latestSocket = null;
    createSocket.mockClear();
    mockApi.listTasks.mockReset();
    mockApi.listTasks.mockImplementation(() => Promise.resolve([]));

    const { __resetRealtimeClientForTests, __setRealtimeClientTestOverrides } =
      await import('../utils/realtime-client');

    __resetRealtimeClientForTests();
    __setRealtimeClientTestOverrides({
      createSocket: createSocket as unknown as typeof import('socket.io-client').io,
      getWsUrl: () => REALTIME_TEST_IDS.wsUrl,
    });
  });

  it('connects with auth.token from the access token', async () => {
    setAccessToken(REALTIME_TEST_IDS.accessToken);
    const { connectRealtime, __getRealtimeSocketForTests } =
      await import('../utils/realtime-client');

    connectRealtime();

    expect(createSocket).toHaveBeenCalledTimes(1);
    expect(createSocket.mock.calls[0]?.[0]).toBe(REALTIME_TEST_IDS.wsUrl);
    expect(createSocket.mock.calls[0]?.[1]).toMatchObject({
      auth: { [WS_AUTH_TOKEN_KEY]: REALTIME_TEST_IDS.accessToken },
      transports: ['websocket'],
    });
    expect(__getRealtimeSocketForTests()).not.toBeNull();
    expect(latestSocket?.auth).toEqual({
      [WS_AUTH_TOKEN_KEY]: REALTIME_TEST_IDS.accessToken,
    });
  });

  it('joins and leaves list rooms when selection changes', async () => {
    setAccessToken(REALTIME_TEST_IDS.accessToken);
    const { connectRealtime, syncRealtimeListRoom, __getRealtimeJoinedListIdForTests } =
      await import('../utils/realtime-client');

    connectRealtime();
    await flushRoomSync();

    syncRealtimeListRoom(REALTIME_TEST_IDS.listA);
    await flushRoomSync();

    expect(latestSocket?.emitted).toEqual([
      { event: WS_CLIENT_EVENTS.LIST_JOIN, payload: { listId: REALTIME_TEST_IDS.listA } },
    ]);
    expect(__getRealtimeJoinedListIdForTests()).toBe(REALTIME_TEST_IDS.listA);

    syncRealtimeListRoom(REALTIME_TEST_IDS.listB);
    await flushRoomSync();

    expect(latestSocket?.emitted.slice(-2)).toEqual([
      { event: WS_CLIENT_EVENTS.LIST_LEAVE, payload: { listId: REALTIME_TEST_IDS.listA } },
      { event: WS_CLIENT_EVENTS.LIST_JOIN, payload: { listId: REALTIME_TEST_IDS.listB } },
    ]);
    expect(__getRealtimeJoinedListIdForTests()).toBe(REALTIME_TEST_IDS.listB);

    syncRealtimeListRoom(null);
    await flushRoomSync();

    expect(latestSocket?.emitted.at(-1)).toEqual({
      event: WS_CLIENT_EVENTS.LIST_LEAVE,
      payload: { listId: REALTIME_TEST_IDS.listB },
    });
    expect(__getRealtimeJoinedListIdForTests()).toBeNull();
  });

  it('leaves a superseded in-flight join when selection races to null', async () => {
    setAccessToken(REALTIME_TEST_IDS.accessToken);
    const { connectRealtime, syncRealtimeListRoom, __getRealtimeJoinedListIdForTests } =
      await import('../utils/realtime-client');

    connectRealtime();
    await flushRoomSync();

    latestSocket!.autoAck = false;

    syncRealtimeListRoom(REALTIME_TEST_IDS.listA);
    await waitForPendingAcks(1);

    expect(latestSocket?.pendingAcks[0]?.event).toBe(WS_CLIENT_EVENTS.LIST_JOIN);

    syncRealtimeListRoom(null);
    // Allow the superseding leave to resolve while we complete the deferred join ack.
    latestSocket!.autoAck = true;
    latestSocket!.flushAck(0, { success: true });
    await flushRoomSync();

    expect(latestSocket?.emitted).toEqual([
      { event: WS_CLIENT_EVENTS.LIST_JOIN, payload: { listId: REALTIME_TEST_IDS.listA } },
      { event: WS_CLIENT_EVENTS.LIST_LEAVE, payload: { listId: REALTIME_TEST_IDS.listA } },
    ]);
    expect(__getRealtimeJoinedListIdForTests()).toBeNull();
  });

  it('serializes rapid list switches and ends on the latest room', async () => {
    setAccessToken(REALTIME_TEST_IDS.accessToken);
    const { connectRealtime, syncRealtimeListRoom, __getRealtimeJoinedListIdForTests } =
      await import('../utils/realtime-client');

    connectRealtime();
    await flushRoomSync();

    syncRealtimeListRoom(REALTIME_TEST_IDS.listA);
    syncRealtimeListRoom(REALTIME_TEST_IDS.listB);
    syncRealtimeListRoom(REALTIME_TEST_IDS.listC);
    await flushRoomSync();

    expect(__getRealtimeJoinedListIdForTests()).toBe(REALTIME_TEST_IDS.listC);
    expect(latestSocket?.emitted.at(-1)).toEqual({
      event: WS_CLIENT_EVENTS.LIST_JOIN,
      payload: { listId: REALTIME_TEST_IDS.listC },
    });
  });

  it('treats invalid join acks as failures without throwing', async () => {
    setAccessToken(REALTIME_TEST_IDS.accessToken);
    const { connectRealtime, syncRealtimeListRoom, __getRealtimeJoinedListIdForTests } =
      await import('../utils/realtime-client');

    connectRealtime();
    await flushRoomSync();

    latestSocket!.autoAck = false;
    syncRealtimeListRoom(REALTIME_TEST_IDS.listA);
    await waitForPendingAcks(1);
    latestSocket!.flushAck(0, null);
    await flushRoomSync();

    expect(__getRealtimeJoinedListIdForTests()).toBeNull();
  });

  it('re-joins the active list after a transport disconnect without clearing desired room', async () => {
    setAccessToken(REALTIME_TEST_IDS.accessToken);
    const { connectRealtime, syncRealtimeListRoom, __getRealtimeJoinedListIdForTests } =
      await import('../utils/realtime-client');

    connectRealtime();
    await flushRoomSync();

    syncRealtimeListRoom(REALTIME_TEST_IDS.listA);
    await flushRoomSync();

    expect(__getRealtimeJoinedListIdForTests()).toBe(REALTIME_TEST_IDS.listA);
    const joinCountBefore = latestSocket!.emitted.filter(
      (item) => item.event === WS_CLIENT_EVENTS.LIST_JOIN,
    ).length;

    latestSocket!.trigger('disconnect');
    expect(__getRealtimeJoinedListIdForTests()).toBeNull();

    latestSocket!.connected = true;
    latestSocket!.trigger('connect');
    await flushRoomSync();
    await Promise.resolve();
    await Promise.resolve();

    expect(__getRealtimeJoinedListIdForTests()).toBe(REALTIME_TEST_IDS.listA);
    const joinCountAfter = latestSocket!.emitted.filter(
      (item) => item.event === WS_CLIENT_EVENTS.LIST_JOIN,
    ).length;
    expect(joinCountAfter).toBe(joinCountBefore + 1);
  });

  it('re-joins the active list and silently refetches tasks after reconnect', async () => {
    setAccessToken(REALTIME_TEST_IDS.accessToken);
    const { useTasksStore } = await import('../stores/tasks');
    const tasksStore = useTasksStore();
    tasksStore.listId = REALTIME_TEST_IDS.listA;
    tasksStore.selectTask(REALTIME_TEST_IDS.taskA);
    tasksStore.tasks = [makeTask(REALTIME_TEST_IDS.taskA, REALTIME_TEST_IDS.listA)];

    mockApi.listTasks.mockImplementation(() =>
      Promise.resolve([makeTask(REALTIME_TEST_IDS.taskA, REALTIME_TEST_IDS.listA)]),
    );

    const { connectRealtime, syncRealtimeListRoom, __getRealtimeJoinedListIdForTests } =
      await import('../utils/realtime-client');

    connectRealtime();
    await flushRoomSync();

    syncRealtimeListRoom(REALTIME_TEST_IDS.listA);
    await flushRoomSync();

    expect(__getRealtimeJoinedListIdForTests()).toBe(REALTIME_TEST_IDS.listA);
    mockApi.listTasks.mockClear();

    latestSocket!.trigger('disconnect');
    latestSocket!.connected = true;
    latestSocket!.trigger('connect');
    await flushRoomSync();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockApi.listTasks).toHaveBeenCalledWith(REALTIME_TEST_IDS.listA);
    expect(tasksStore.selectedTaskId).toBe(REALTIME_TEST_IDS.taskA);
    expect(tasksStore.isLoading).toBe(false);
    expect(__getRealtimeJoinedListIdForTests()).toBe(REALTIME_TEST_IDS.listA);
  });

  it('applies server events into Pinia stores and ignores invalid payloads', async () => {
    setAccessToken(REALTIME_TEST_IDS.accessToken);
    const { useListsStore } = await import('../stores/lists');
    const { useTasksStore } = await import('../stores/tasks');
    const listsStore = useListsStore();
    const tasksStore = useTasksStore();

    tasksStore.listId = REALTIME_TEST_IDS.listA;
    tasksStore.tasks = [makeTask(REALTIME_TEST_IDS.taskA, REALTIME_TEST_IDS.listA)];

    const { connectRealtime } = await import('../utils/realtime-client');
    connectRealtime();
    await flushRoomSync();

    latestSocket!.trigger(WS_SERVER_EVENTS.LIST_CREATED, { list: null });
    expect(listsStore.lists).toEqual([]);

    latestSocket!.trigger(WS_SERVER_EVENTS.LIST_CREATED, {
      list: makeList(REALTIME_TEST_IDS.listB, 'List B'),
      occurredAt: '2026-01-02T00:00:00.000Z',
    });

    expect(listsStore.lists.map((list) => list.id)).toEqual([REALTIME_TEST_IDS.listB]);

    latestSocket!.trigger(WS_SERVER_EVENTS.TASK_CREATED, {
      listId: REALTIME_TEST_IDS.listB,
      task: makeTask(REALTIME_TEST_IDS.taskB, REALTIME_TEST_IDS.listB),
      occurredAt: '2026-01-02T00:00:00.000Z',
    });

    expect(tasksStore.tasks.map((task) => task.id)).toEqual([REALTIME_TEST_IDS.taskA]);

    latestSocket!.trigger(WS_SERVER_EVENTS.TASK_CREATED, {
      listId: REALTIME_TEST_IDS.listA,
      task: makeTask(REALTIME_TEST_IDS.taskB, REALTIME_TEST_IDS.listA),
      occurredAt: '2026-01-02T00:00:00.000Z',
    });

    expect(tasksStore.tasks.map((task) => task.id).sort()).toEqual([
      REALTIME_TEST_IDS.taskA,
      REALTIME_TEST_IDS.taskB,
    ]);

    latestSocket!.trigger(WS_SERVER_EVENTS.TASK_COMPLETED, {
      listId: REALTIME_TEST_IDS.listA,
      taskId: REALTIME_TEST_IDS.taskA,
      status: TaskStatus.COMPLETED,
      completedAt: '2026-01-03T00:00:00.000Z',
      occurredAt: '2026-01-03T00:00:00.000Z',
    });

    expect(tasksStore.tasks.find((task) => task.id === REALTIME_TEST_IDS.taskA)?.status).toBe(
      TaskStatus.COMPLETED,
    );

    latestSocket!.trigger(WS_SERVER_EVENTS.TASK_DELETED, {
      listId: REALTIME_TEST_IDS.listA,
      taskId: REALTIME_TEST_IDS.taskB,
      occurredAt: '2026-01-04T00:00:00.000Z',
    });

    expect(tasksStore.tasks.map((task) => task.id)).toEqual([REALTIME_TEST_IDS.taskA]);

    latestSocket!.trigger(WS_SERVER_EVENTS.LIST_DELETED, {
      listId: REALTIME_TEST_IDS.listB,
      occurredAt: '2026-01-05T00:00:00.000Z',
    });

    expect(listsStore.lists).toEqual([]);
  });

  it('disconnect clears the socket and stops reconnecting with a new token', async () => {
    setAccessToken(REALTIME_TEST_IDS.accessToken);
    const {
      connectRealtime,
      disconnectRealtime,
      syncRealtimeAccessToken,
      __getRealtimeSocketForTests,
    } = await import('../utils/realtime-client');

    connectRealtime();
    await flushRoomSync();

    const active = latestSocket;
    expect(active).not.toBeNull();

    disconnectRealtime();

    expect(active?.removeAllListeners).toHaveBeenCalled();
    expect(active?.disconnect).toHaveBeenCalled();
    expect(__getRealtimeSocketForTests()).toBeNull();

    setAccessToken(REALTIME_TEST_IDS.refreshedToken);
    syncRealtimeAccessToken();
    expect(createSocket).toHaveBeenCalledTimes(1);
  });

  it('updates socket auth and reconnects when the access token refreshes', async () => {
    setAccessToken(REALTIME_TEST_IDS.accessToken);
    const { connectRealtime, syncRealtimeAccessToken } = await import('../utils/realtime-client');

    connectRealtime();
    await flushRoomSync();

    setAccessToken(REALTIME_TEST_IDS.refreshedToken);
    syncRealtimeAccessToken();

    expect(latestSocket?.auth).toEqual({
      [WS_AUTH_TOKEN_KEY]: REALTIME_TEST_IDS.refreshedToken,
    });
    expect(latestSocket?.disconnect).toHaveBeenCalled();
    expect(latestSocket?.connect).toHaveBeenCalled();
  });
});
