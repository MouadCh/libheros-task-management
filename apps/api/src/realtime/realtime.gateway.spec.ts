import { JwtService } from '@nestjs/jwt';
import {
  WS_CLIENT_EVENTS,
  WS_SERVER_EVENTS,
  TaskStatus,
  type TaskDto,
  type TaskListDto,
} from '@libheros/contracts';
import type { TaskList } from '@prisma/client';
import type { Socket } from 'socket.io';
import { AppConfigService } from '../common/config/app-config.service';
import { LIST_NOT_FOUND_MESSAGE } from '../lists/constants/lists.constants';
import { ListsRepository } from '../lists/lists.repository';
import { WS_ACK_SUCCESS_RESPONSE } from './constants/realtime.constants';
import { RealtimeGateway } from './realtime.gateway';
import {
  getActiveListId,
  setActiveListId,
  setSocketState,
} from './types/authenticated-socket.types';
import { buildListRoom, buildUserRoom } from './utils/room.util';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let jwtService: jest.Mocked<Pick<JwtService, 'verify'>>;
  let listsRepository: jest.Mocked<Pick<ListsRepository, 'findByIdForUser'>>;
  let emit: jest.Mock;
  let to: jest.Mock;
  let server: { to: jest.Mock };

  const userId = 'user-1';
  const listId = 'list-1';

  const list: TaskList = {
    id: listId,
    userId,
    name: 'Courses',
    normalizedName: 'courses',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const task: TaskDto = {
    id: 'task-1',
    listId,
    shortDescription: 'Buy milk',
    longDescription: null,
    dueDate: '2026-12-31T12:00:00.000Z',
    status: TaskStatus.ACTIVE,
    completedAt: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };

  const taskListDto: TaskListDto = {
    id: listId,
    name: 'Courses',
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  };

  beforeEach(() => {
    emit = jest.fn();
    to = jest.fn().mockReturnValue({ emit });
    server = { to };

    jwtService = {
      verify: jest.fn().mockReturnValue({ sub: userId }),
    };

    listsRepository = {
      findByIdForUser: jest.fn(),
    };

    gateway = new RealtimeGateway(
      jwtService as unknown as JwtService,
      {
        jwtAccessSecret: 'secret',
      } as AppConfigService,
      listsRepository as unknown as ListsRepository,
    );

    Object.defineProperty(gateway, 'server', {
      value: server,
    });
  });

  function createSocket(overrides: Partial<Socket> = {}): Socket {
    const join = jest.fn().mockResolvedValue(undefined);
    const leave = jest.fn().mockResolvedValue(undefined);
    const disconnect = jest.fn();

    return {
      handshake: { auth: { token: 'valid-token' } },
      join,
      leave,
      disconnect,
      ...overrides,
    } as unknown as Socket;
  }

  it('authenticates valid handshake tokens and joins the user room', () => {
    const socket = createSocket();

    gateway.handleConnection(socket);

    expect(jwtService.verify).toHaveBeenCalledWith('valid-token', { secret: 'secret' });
    expect(socket.join).toHaveBeenCalledWith(buildUserRoom(userId));
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects sockets with missing or invalid tokens', () => {
    const missingTokenSocket = createSocket({
      handshake: { auth: {} } as Socket['handshake'],
    });
    gateway.handleConnection(missingTokenSocket);
    expect(missingTokenSocket.disconnect).toHaveBeenCalledWith(true);

    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    const invalidTokenSocket = createSocket();
    gateway.handleConnection(invalidTokenSocket);
    expect(invalidTokenSocket.disconnect).toHaveBeenCalledWith(true);
  });

  it('ignores disconnect for sockets that never authenticated', () => {
    const socket = createSocket();

    expect(() => gateway.handleDisconnect(socket)).not.toThrow();
    expect(socket.leave).not.toHaveBeenCalled();
  });

  it('joins an owned list room and leaves the previous one', async () => {
    listsRepository.findByIdForUser.mockResolvedValue(list);
    const socket = createSocket();
    setSocketState(socket, { userId });
    setActiveListId(socket, 'old-list');

    const result = await gateway.handleListJoin(socket, { listId });

    expect(result).toEqual(WS_ACK_SUCCESS_RESPONSE);
    expect(socket.leave).toHaveBeenCalledWith(buildListRoom('old-list'));
    expect(socket.join).toHaveBeenCalledWith(buildListRoom(listId));
    expect(getActiveListId(socket)).toBe(listId);
  });

  it('rejects list join for foreign lists', async () => {
    listsRepository.findByIdForUser.mockResolvedValue(null);
    const socket = createSocket();
    setSocketState(socket, { userId });

    const result = await gateway.handleListJoin(socket, { listId });

    expect(result).toEqual({ success: false, message: LIST_NOT_FOUND_MESSAGE });
    expect(socket.join).not.toHaveBeenCalledWith(buildListRoom(listId));
  });

  it('leaves list rooms on disconnect and list:leave', async () => {
    const socket = createSocket();
    setSocketState(socket, { userId });
    setActiveListId(socket, listId);

    gateway.handleDisconnect(socket);
    expect(socket.leave).toHaveBeenCalledWith(buildListRoom(listId));
    expect(() => getActiveListId(socket)).toThrow('Unauthenticated socket');

    const activeSocket = createSocket();
    setSocketState(activeSocket, { userId });
    setActiveListId(activeSocket, listId);
    await gateway.handleListLeave(activeSocket, { listId });
    expect(activeSocket.leave).toHaveBeenCalledWith(buildListRoom(listId));
    expect(getActiveListId(activeSocket)).toBeUndefined();
  });

  it('broadcasts typed task and list events to the correct rooms', () => {
    gateway.emitTaskCreated(listId, task);
    gateway.emitTaskUpdated(listId, task);
    gateway.emitTaskDeleted(listId, task.id);
    gateway.emitTaskCompleted(listId, task.id, TaskStatus.COMPLETED, '2026-01-03T00:00:00.000Z');
    gateway.emitListCreated(userId, taskListDto);
    gateway.emitListDeleted(userId, listId);

    expect(to).toHaveBeenCalledWith(buildListRoom(listId));
    expect(to).toHaveBeenCalledWith(buildUserRoom(userId));
    expect(emit).toHaveBeenCalledWith(
      WS_SERVER_EVENTS.TASK_CREATED,
      expect.objectContaining({ listId, task }),
    );
    expect(emit).toHaveBeenCalledWith(
      WS_SERVER_EVENTS.TASK_UPDATED,
      expect.objectContaining({ listId, task }),
    );
    expect(emit).toHaveBeenCalledWith(
      WS_SERVER_EVENTS.TASK_DELETED,
      expect.objectContaining({ listId, taskId: task.id }),
    );
    expect(emit).toHaveBeenCalledWith(
      WS_SERVER_EVENTS.TASK_COMPLETED,
      expect.objectContaining({
        listId,
        taskId: task.id,
        status: TaskStatus.COMPLETED,
      }),
    );
    expect(emit).toHaveBeenCalledWith(
      WS_SERVER_EVENTS.LIST_CREATED,
      expect.objectContaining({ list: taskListDto }),
    );
    expect(emit).toHaveBeenCalledWith(
      WS_SERVER_EVENTS.LIST_DELETED,
      expect.objectContaining({ listId }),
    );
    expect(emit).not.toHaveBeenCalledWith(WS_CLIENT_EVENTS.LIST_JOIN, expect.anything());
  });
});
