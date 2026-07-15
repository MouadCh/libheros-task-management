import type {
  TaskCompletedPayload,
  TaskCreatedPayload,
  TaskDeletedPayload,
  TaskDto,
  TaskListDto,
  TaskUpdatedPayload,
} from '@libheros/contracts';
import { io, type Socket } from 'socket.io-client';
import {
  WS_ACK_TIMEOUT_MS,
  WS_AUTH_TOKEN_KEY,
  WS_CLIENT_EVENTS,
  WS_SERVER_EVENTS,
  WS_TRANSPORT,
} from '../constants/realtime.constants';
import { TaskStatus } from '../constants/task-status';
import { useListsStore } from '../stores/lists';
import { useTasksStore } from '../stores/tasks';
import { getAccessToken } from './auth-session';

type JoinAck = { success: true } | { success: false; message: string };

type RealtimeClientTestOverrides = {
  createSocket?: typeof io;
  getWsUrl?: () => string;
};

let socket: Socket | null = null;
let desiredListId: string | null = null;
let joinedListId: string | null = null;
/** ListId for an in-flight JOIN that may already be accepted server-side. */
let pendingJoinListId: string | null = null;
let joinGeneration = 0;
let roomSyncChain: Promise<void> = Promise.resolve();
let intentionallyDisconnected = false;
let hasCompletedInitialConnect = false;
let lastAuthToken: string | null = null;
let testOverrides: RealtimeClientTestOverrides = {};

/**
 * Multi-tab domain sync is handled by each tab's Socket.IO connection
 * (user + list rooms). Auth refresh cookie rotation across tabs remains
 * a separate concern (see auth-session).
 */

function resolveWsUrl(): string {
  if (testOverrides.getWsUrl) {
    return testOverrides.getWsUrl();
  }

  const config = useRuntimeConfig();
  return String(config.public.wsUrl);
}

function createSocketConnection(url: string, token: string): Socket {
  const create = testOverrides.createSocket ?? io;
  return create(url, {
    auth: { [WS_AUTH_TOKEN_KEY]: token },
    transports: [WS_TRANSPORT],
    autoConnect: true,
    reconnection: true,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJoinAck(value: unknown): JoinAck | null {
  if (!isRecord(value) || typeof value.success !== 'boolean') {
    return null;
  }

  if (value.success === true) {
    return { success: true };
  }

  return {
    success: false,
    message: typeof value.message === 'string' ? value.message : 'Join/leave failed',
  };
}

function isTaskListDto(value: unknown): value is TaskListDto {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isTaskDto(value: unknown): value is TaskDto {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.listId === 'string' &&
    typeof value.shortDescription === 'string' &&
    (value.longDescription === null || typeof value.longDescription === 'string') &&
    typeof value.dueDate === 'string' &&
    (value.status === TaskStatus.ACTIVE || value.status === TaskStatus.COMPLETED) &&
    (value.completedAt === null || typeof value.completedAt === 'string') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function bindServerEventHandlers(activeSocket: Socket): void {
  activeSocket.on(WS_SERVER_EVENTS.LIST_CREATED, (payload: unknown) => {
    if (!isRecord(payload) || !isTaskListDto(payload.list)) {
      return;
    }

    useListsStore().applyListCreated(payload.list);
  });

  activeSocket.on(WS_SERVER_EVENTS.LIST_DELETED, (payload: unknown) => {
    if (!isRecord(payload) || typeof payload.listId !== 'string') {
      return;
    }

    useListsStore().applyListDeleted(payload.listId);
  });

  activeSocket.on(WS_SERVER_EVENTS.TASK_CREATED, (payload: unknown) => {
    if (!isRecord(payload) || typeof payload.listId !== 'string' || !isTaskDto(payload.task)) {
      return;
    }

    const event: TaskCreatedPayload = {
      listId: payload.listId,
      task: payload.task,
      occurredAt: typeof payload.occurredAt === 'string' ? payload.occurredAt : '',
    };
    useTasksStore().applyTaskCreated(event);
  });

  activeSocket.on(WS_SERVER_EVENTS.TASK_UPDATED, (payload: unknown) => {
    if (!isRecord(payload) || typeof payload.listId !== 'string' || !isTaskDto(payload.task)) {
      return;
    }

    const event: TaskUpdatedPayload = {
      listId: payload.listId,
      task: payload.task,
      occurredAt: typeof payload.occurredAt === 'string' ? payload.occurredAt : '',
    };
    useTasksStore().applyTaskUpdated(event);
  });

  activeSocket.on(WS_SERVER_EVENTS.TASK_DELETED, (payload: unknown) => {
    if (
      !isRecord(payload) ||
      typeof payload.listId !== 'string' ||
      typeof payload.taskId !== 'string'
    ) {
      return;
    }

    const event: TaskDeletedPayload = {
      listId: payload.listId,
      taskId: payload.taskId,
      occurredAt: typeof payload.occurredAt === 'string' ? payload.occurredAt : '',
    };
    useTasksStore().applyTaskDeleted(event);
  });

  activeSocket.on(WS_SERVER_EVENTS.TASK_COMPLETED, (payload: unknown) => {
    if (
      !isRecord(payload) ||
      typeof payload.listId !== 'string' ||
      typeof payload.taskId !== 'string' ||
      (payload.status !== TaskStatus.ACTIVE && payload.status !== TaskStatus.COMPLETED)
    ) {
      return;
    }

    const event: TaskCompletedPayload = {
      listId: payload.listId,
      taskId: payload.taskId,
      status: payload.status,
      completedAt:
        payload.completedAt === null || typeof payload.completedAt === 'string'
          ? payload.completedAt
          : null,
      occurredAt: typeof payload.occurredAt === 'string' ? payload.occurredAt : '',
    };
    useTasksStore().applyTaskCompleted(event);
  });
}

function emitWithAck(
  activeSocket: Socket,
  event: string,
  payload: { listId: string },
): Promise<JoinAck> {
  return new Promise((resolve) => {
    activeSocket
      .timeout(WS_ACK_TIMEOUT_MS)
      .emit(event, payload, (err: Error | null, ack: unknown) => {
        if (err) {
          resolve({ success: false, message: err.message });
          return;
        }

        const parsed = parseJoinAck(ack);
        if (!parsed) {
          resolve({ success: false, message: 'Invalid join/leave acknowledgement' });
          return;
        }

        resolve(parsed);
      });
  });
}

async function leaveList(listId: string): Promise<void> {
  if (!socket?.connected) {
    if (joinedListId === listId) {
      joinedListId = null;
    }
    if (pendingJoinListId === listId) {
      pendingJoinListId = null;
    }
    return;
  }

  await emitWithAck(socket, WS_CLIENT_EVENTS.LIST_LEAVE, { listId });

  if (joinedListId === listId) {
    joinedListId = null;
  }
  if (pendingJoinListId === listId) {
    pendingJoinListId = null;
  }
}

async function reconcileRoomMembership(): Promise<void> {
  if (intentionallyDisconnected || !socket?.connected) {
    return;
  }

  const generation = joinGeneration;
  const target = desiredListId;

  if (joinedListId && joinedListId !== target) {
    await leaveList(joinedListId);
  }

  if (pendingJoinListId && pendingJoinListId !== target && pendingJoinListId !== joinedListId) {
    await leaveList(pendingJoinListId);
  }

  if (intentionallyDisconnected || generation !== joinGeneration) {
    return;
  }

  if (!target) {
    return;
  }

  if (joinedListId === target) {
    return;
  }

  pendingJoinListId = target;
  const ack = await emitWithAck(socket, WS_CLIENT_EVENTS.LIST_JOIN, { listId: target });

  if (intentionallyDisconnected) {
    return;
  }

  if (pendingJoinListId === target) {
    pendingJoinListId = null;
  }

  if (generation !== joinGeneration || desiredListId !== target) {
    // Server may have accepted the join before we observed the superseding selection.
    if (ack.success) {
      await leaveList(target);
    }
    return;
  }

  if (ack.success) {
    joinedListId = target;
  }
}

function enqueueRoomSync(): void {
  roomSyncChain = roomSyncChain.then(() => reconcileRoomMembership()).catch(() => undefined);
}

let connectHandlerChain: Promise<void> = Promise.resolve();

async function handleConnected(isReconnect: boolean): Promise<void> {
  if (intentionallyDisconnected) {
    return;
  }

  await new Promise<void>((resolve) => {
    roomSyncChain = roomSyncChain
      .then(() => reconcileRoomMembership())
      .catch(() => undefined)
      .finally(() => resolve());
  });

  if (intentionallyDisconnected || !isReconnect || !desiredListId) {
    return;
  }

  const tasksStore = useTasksStore();
  if (tasksStore.listId === desiredListId || tasksStore.listId === null) {
    try {
      await tasksStore.fetchTasks(desiredListId, {
        preserveSelection: true,
        silent: true,
      });
    } catch {
      // HTTP UI already surfaces load failures; keep socket session alive.
    }
  }
}

function clearLocalRoomMembership(): void {
  joinedListId = null;
  pendingJoinListId = null;
}

function attachConnectionHandlers(activeSocket: Socket): void {
  activeSocket.on('disconnect', () => {
    // Gateway drops list rooms on disconnect; local membership must not skip re-join.
    clearLocalRoomMembership();
  });

  activeSocket.on('connect', () => {
    if (intentionallyDisconnected) {
      return;
    }

    const isReconnect = hasCompletedInitialConnect;
    hasCompletedInitialConnect = true;
    connectHandlerChain = connectHandlerChain
      .then(() => handleConnected(isReconnect))
      .catch(() => undefined);
  });

  bindServerEventHandlers(activeSocket);
}

export function connectRealtime(): void {
  if (import.meta.server) {
    return;
  }

  intentionallyDisconnected = false;

  const token = getAccessToken();
  if (!token) {
    return;
  }

  if (socket) {
    if (lastAuthToken !== token) {
      lastAuthToken = token;
      socket.auth = { [WS_AUTH_TOKEN_KEY]: token };
      socket.disconnect().connect();
    }
    return;
  }

  lastAuthToken = token;
  socket = createSocketConnection(resolveWsUrl(), token);
  attachConnectionHandlers(socket);
}

export function disconnectRealtime(): void {
  intentionallyDisconnected = true;
  joinGeneration += 1;
  desiredListId = null;
  clearLocalRoomMembership();
  roomSyncChain = Promise.resolve();
  connectHandlerChain = Promise.resolve();
  hasCompletedInitialConnect = false;
  lastAuthToken = null;

  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

export function syncRealtimeListRoom(listId: string | null): void {
  desiredListId = listId;
  joinGeneration += 1;

  if (!socket?.connected) {
    return;
  }

  enqueueRoomSync();
}

export function syncRealtimeAccessToken(): void {
  if (intentionallyDisconnected || !socket) {
    return;
  }

  const token = getAccessToken();
  if (!token) {
    disconnectRealtime();
    return;
  }

  if (lastAuthToken === token) {
    return;
  }

  lastAuthToken = token;
  socket.auth = { [WS_AUTH_TOKEN_KEY]: token };
  socket.disconnect().connect();
}

/** @internal Test helpers */
export function __setRealtimeClientTestOverrides(overrides: RealtimeClientTestOverrides): void {
  testOverrides = overrides;
}

/** @internal Test helpers */
export function __resetRealtimeClientForTests(): void {
  disconnectRealtime();
  intentionallyDisconnected = false;
  testOverrides = {};
}

/** @internal Test helpers */
export function __getRealtimeSocketForTests(): Socket | null {
  return socket;
}

/** @internal Test helpers */
export function __getRealtimeJoinedListIdForTests(): string | null {
  return joinedListId;
}

/** @internal Test helpers */
export function __flushRealtimeRoomSyncForTests(): Promise<void> {
  return roomSyncChain.then(() => undefined);
}
