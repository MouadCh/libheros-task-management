import { HttpStatus, type INestApplication } from '@nestjs/common';
import {
  WS_CLIENT_EVENTS,
  WS_SERVER_EVENTS,
  TaskStatus,
  type ListCreatedPayload,
  type TaskCompletedPayload,
  type TaskCreatedPayload,
  type TaskDeletedPayload,
  type TaskUpdatedPayload,
} from '@libheros/contracts';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ApiRoutes } from '../src/common/constants/api.constants';
import { LIST_NOT_FOUND_MESSAGE } from '../src/lists/constants/lists.constants';
import { WS_ACK_SUCCESS_RESPONSE } from '../src/realtime/constants/realtime.constants';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  buildBearerAuthorization,
  buildRegisterPayload,
} from '../src/testing/fixtures/auth.fixture';
import {
  buildCreateListPayload,
  buildCreateTaskPayload,
  buildSecondaryRegisterPayload,
  buildUpdateTaskPayload,
  listsTestData,
} from '../src/testing/fixtures/lists-tasks.fixture';
import {
  buildListJoinPayload,
  buildListLeavePayload,
  realtimeTestData,
  taskStatusTestPayloads,
} from '../src/testing/fixtures/realtime.fixture';
import { registerAndGetAccessToken } from './utils/auth.util';
import { createE2eApp } from './utils/create-e2e-app';
import { ensureDatabaseReady, resetDatabase } from './utils/database';
import {
  closeSocket,
  connectAuthenticatedSocket,
  connectInvalidTokenSocket,
  connectUnauthenticatedSocket,
  emitWithAck,
  getWebSocketBaseUrl,
  waitForEventPropagationGrace,
  waitForSocketEvent,
} from './utils/ws.util';

describe('Realtime (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let wsBaseUrl: string;

  beforeAll(async () => {
    await ensureDatabaseReady();
    app = await createE2eApp();
    await app.listen(0);
    wsBaseUrl = getWebSocketBaseUrl(app);
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rejects WebSocket connections without a valid access token', async () => {
    const missingTokenSocket = await connectUnauthenticatedSocket(wsBaseUrl);
    expect(missingTokenSocket.connected).toBe(false);
    await closeSocket(missingTokenSocket);

    const invalidTokenSocket = await connectInvalidTokenSocket(
      wsBaseUrl,
      realtimeTestData.invalidAccessToken,
    );
    expect(invalidTokenSocket.connected).toBe(false);
    await closeSocket(invalidTokenSocket);
  });

  it('accepts WebSocket connections with a valid access token', async () => {
    const { accessToken } = await registerAndGetAccessToken(
      app.getHttpServer(),
      buildRegisterPayload(),
    );

    const socket = await connectAuthenticatedSocket(wsBaseUrl, accessToken);
    expect(socket.connected).toBe(true);
    await closeSocket(socket);
  });

  it('joins owned list rooms and rejects foreign list joins', async () => {
    const primary = await registerAndGetAccessToken(app.getHttpServer(), buildRegisterPayload());
    const secondary = await registerAndGetAccessToken(
      app.getHttpServer(),
      buildSecondaryRegisterPayload(),
    );

    const listResponse = await request(app.getHttpServer())
      .post(ApiRoutes.lists.base())
      .set(buildBearerAuthorization(primary.accessToken))
      .send(buildCreateListPayload())
      .expect(HttpStatus.CREATED);

    const listId = listResponse.body.id as string;
    const ownedSocket = await connectAuthenticatedSocket(wsBaseUrl, primary.accessToken);
    const foreignSocket = await connectAuthenticatedSocket(wsBaseUrl, secondary.accessToken);

    const joinOwned = await emitWithAck(
      ownedSocket,
      WS_CLIENT_EVENTS.LIST_JOIN,
      buildListJoinPayload(listId),
    );
    expect(joinOwned).toEqual(WS_ACK_SUCCESS_RESPONSE);

    const joinForeign = await emitWithAck(
      foreignSocket,
      WS_CLIENT_EVENTS.LIST_JOIN,
      buildListJoinPayload(listId),
    );
    expect(joinForeign).toEqual({ success: false, message: LIST_NOT_FOUND_MESSAGE });

    await closeSocket(ownedSocket);
    await closeSocket(foreignSocket);
  });

  it('leaves list rooms on list:leave', async () => {
    const { accessToken } = await registerAndGetAccessToken(
      app.getHttpServer(),
      buildRegisterPayload(),
    );

    const listResponse = await request(app.getHttpServer())
      .post(ApiRoutes.lists.base())
      .set(buildBearerAuthorization(accessToken))
      .send(buildCreateListPayload())
      .expect(HttpStatus.CREATED);

    const listId = listResponse.body.id as string;
    const socket = await connectAuthenticatedSocket(wsBaseUrl, accessToken);

    await emitWithAck(socket, WS_CLIENT_EVENTS.LIST_JOIN, buildListJoinPayload(listId));
    const leaveResponse = await emitWithAck(
      socket,
      WS_CLIENT_EVENTS.LIST_LEAVE,
      buildListLeavePayload(listId),
    );

    expect(leaveResponse).toEqual(WS_ACK_SUCCESS_RESPONSE);
    await closeSocket(socket);
  });

  it('broadcasts task events to clients joined to the list room after REST mutations', async () => {
    const { accessToken } = await registerAndGetAccessToken(
      app.getHttpServer(),
      buildRegisterPayload(),
    );
    const auth = buildBearerAuthorization(accessToken);

    const listResponse = await request(app.getHttpServer())
      .post(ApiRoutes.lists.base())
      .set(auth)
      .send(buildCreateListPayload())
      .expect(HttpStatus.CREATED);

    const listId = listResponse.body.id as string;
    const socket = await connectAuthenticatedSocket(wsBaseUrl, accessToken);
    await emitWithAck(socket, WS_CLIENT_EVENTS.LIST_JOIN, buildListJoinPayload(listId));

    const createdEventPromise = waitForSocketEvent<TaskCreatedPayload>(
      socket,
      WS_SERVER_EVENTS.TASK_CREATED,
    );

    const createTaskResponse = await request(app.getHttpServer())
      .post(ApiRoutes.lists.tasks(listId))
      .set(auth)
      .send(buildCreateTaskPayload())
      .expect(HttpStatus.CREATED);

    const taskId = createTaskResponse.body.id as string;
    const createdEvent = await createdEventPromise;
    expect(createdEvent.listId).toBe(listId);
    expect(createdEvent.task.id).toBe(taskId);
    expect(createdEvent.task.shortDescription).toBe(listsTestData.taskShortDescription);
    expect(createdEvent.occurredAt).toEqual(expect.any(String));

    const updatedEventPromise = waitForSocketEvent<TaskUpdatedPayload>(
      socket,
      WS_SERVER_EVENTS.TASK_UPDATED,
    );

    await request(app.getHttpServer())
      .patch(ApiRoutes.tasks.byId(taskId))
      .set(auth)
      .send(buildUpdateTaskPayload())
      .expect(HttpStatus.OK);

    const updatedEvent = await updatedEventPromise;
    expect(updatedEvent.task.shortDescription).toBe(listsTestData.updatedShortDescription);

    const completedEventPromise = waitForSocketEvent<TaskCompletedPayload>(
      socket,
      WS_SERVER_EVENTS.TASK_COMPLETED,
    );

    await request(app.getHttpServer())
      .patch(ApiRoutes.tasks.status(taskId))
      .set(auth)
      .send(taskStatusTestPayloads.complete)
      .expect(HttpStatus.OK);

    const completedEvent = await completedEventPromise;
    expect(completedEvent).toMatchObject({
      listId,
      taskId,
      status: TaskStatus.COMPLETED,
    });

    const deletedEventPromise = waitForSocketEvent<TaskDeletedPayload>(
      socket,
      WS_SERVER_EVENTS.TASK_DELETED,
    );

    await request(app.getHttpServer())
      .delete(ApiRoutes.tasks.byId(taskId))
      .set(auth)
      .expect(HttpStatus.OK);

    const deletedEvent = await deletedEventPromise;
    expect(deletedEvent).toMatchObject({
      listId,
      taskId,
    });

    await closeSocket(socket);
  });

  it('broadcasts list events to all authenticated user sockets', async () => {
    const { accessToken } = await registerAndGetAccessToken(
      app.getHttpServer(),
      buildRegisterPayload(),
    );
    const auth = buildBearerAuthorization(accessToken);

    const firstTab = await connectAuthenticatedSocket(wsBaseUrl, accessToken);
    const secondTab = await connectAuthenticatedSocket(wsBaseUrl, accessToken);

    const listCreatedPromise = Promise.all([
      waitForSocketEvent<ListCreatedPayload>(firstTab, WS_SERVER_EVENTS.LIST_CREATED),
      waitForSocketEvent<ListCreatedPayload>(secondTab, WS_SERVER_EVENTS.LIST_CREATED),
    ]);

    const createListResponse = await request(app.getHttpServer())
      .post(ApiRoutes.lists.base())
      .set(auth)
      .send(buildCreateListPayload())
      .expect(HttpStatus.CREATED);

    const listId = createListResponse.body.id as string;
    const [firstTabEvent, secondTabEvent] = await listCreatedPromise;
    expect(firstTabEvent.list.id).toBe(listId);
    expect(secondTabEvent.list.id).toBe(listId);

    const listDeletedPromise = Promise.all([
      waitForSocketEvent(firstTab, WS_SERVER_EVENTS.LIST_DELETED),
      waitForSocketEvent(secondTab, WS_SERVER_EVENTS.LIST_DELETED),
    ]);

    await request(app.getHttpServer())
      .delete(ApiRoutes.lists.byId(listId))
      .set(auth)
      .expect(HttpStatus.OK);

    const [firstDeletedEvent, secondDeletedEvent] = await listDeletedPromise;
    expect(firstDeletedEvent).toMatchObject({ listId });
    expect(secondDeletedEvent).toMatchObject({ listId });

    await closeSocket(firstTab);
    await closeSocket(secondTab);
  });

  it('does not deliver task events to users who are not joined to the list room', async () => {
    const primary = await registerAndGetAccessToken(app.getHttpServer(), buildRegisterPayload());
    const secondary = await registerAndGetAccessToken(
      app.getHttpServer(),
      buildSecondaryRegisterPayload(),
    );

    const listResponse = await request(app.getHttpServer())
      .post(ApiRoutes.lists.base())
      .set(buildBearerAuthorization(primary.accessToken))
      .send(buildCreateListPayload())
      .expect(HttpStatus.CREATED);

    const listId = listResponse.body.id as string;
    const secondarySocket = await connectAuthenticatedSocket(wsBaseUrl, secondary.accessToken);

    const joinForeign = await emitWithAck(
      secondarySocket,
      WS_CLIENT_EVENTS.LIST_JOIN,
      buildListJoinPayload(listId),
    );
    expect(joinForeign).toEqual({ success: false, message: LIST_NOT_FOUND_MESSAGE });

    let receivedTaskEvent = false;
    secondarySocket.on(WS_SERVER_EVENTS.TASK_CREATED, () => {
      receivedTaskEvent = true;
    });

    await request(app.getHttpServer())
      .post(ApiRoutes.lists.tasks(listId))
      .set(buildBearerAuthorization(primary.accessToken))
      .send(buildCreateTaskPayload())
      .expect(HttpStatus.CREATED);

    await waitForEventPropagationGrace(realtimeTestData.eventPropagationGraceMs);
    expect(receivedTaskEvent).toBe(false);

    await closeSocket(secondarySocket);
  });
});
