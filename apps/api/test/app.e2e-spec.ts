import { HttpStatus, type INestApplication } from '@nestjs/common';
import { TaskStatus } from '@libheros/contracts';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ApiRoutes } from '../src/common/constants/api.constants';
import { ErrorCodes } from '../src/common/exceptions/error-codes';
import { LIST_NOT_FOUND_MESSAGE } from '../src/lists/constants/lists.constants';
import { PrismaService } from '../src/prisma/prisma.service';
import { TASK_NOT_FOUND_MESSAGE } from '../src/tasks/constants/tasks.constants';
import {
  authTestUser,
  buildBearerAuthorization,
  buildRegisterPayload,
} from '../src/testing/fixtures/auth.fixture';
import {
  buildCreateListPayload,
  buildCreateTaskPayload,
  buildSecondaryRegisterPayload,
  listsTestData,
  secondaryAuthUser,
} from '../src/testing/fixtures/lists-tasks.fixture';
import { registerThenLogin } from './utils/auth.util';
import { createE2eApp } from './utils/create-e2e-app';
import { ensureDatabaseReady, resetDatabase } from './utils/database';

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    await ensureDatabaseReady();
    app = await createE2eApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('runs the full flow: register, login, list, task, complete, delete task, delete list', async () => {
    const server = app.getHttpServer();

    const { accessToken, email } = await registerThenLogin(server, buildRegisterPayload());
    expect(email).toBe(authTestUser.normalizedEmail);
    const auth = buildBearerAuthorization(accessToken);

    const listResponse = await request(server)
      .post(ApiRoutes.lists.base())
      .set(auth)
      .send(buildCreateListPayload())
      .expect(HttpStatus.CREATED);

    const listId = listResponse.body.id as string;
    expect(listResponse.body).toMatchObject({
      id: expect.any(String),
      name: listsTestData.listName,
    });

    const createTaskResponse = await request(server)
      .post(ApiRoutes.lists.tasks(listId))
      .set(auth)
      .send(buildCreateTaskPayload())
      .expect(HttpStatus.CREATED);

    const taskId = createTaskResponse.body.id as string;
    expect(createTaskResponse.body).toMatchObject({
      id: expect.any(String),
      listId,
      shortDescription: listsTestData.taskShortDescription,
      status: TaskStatus.ACTIVE,
      completedAt: null,
    });

    const getTaskResponse = await request(server)
      .get(ApiRoutes.tasks.byId(taskId))
      .set(auth)
      .expect(HttpStatus.OK);

    expect(getTaskResponse.body.id).toBe(taskId);

    const completeResponse = await request(server)
      .patch(ApiRoutes.tasks.status(taskId))
      .set(auth)
      .send({ completed: true })
      .expect(HttpStatus.OK);

    expect(completeResponse.body.status).toBe(TaskStatus.COMPLETED);
    expect(completeResponse.body.completedAt).toEqual(expect.any(String));

    const deleteTaskResponse = await request(server)
      .delete(ApiRoutes.tasks.byId(taskId))
      .set(auth)
      .expect(HttpStatus.OK);

    expect(deleteTaskResponse.body).toEqual({ success: true });

    const deletedTaskResponse = await request(server)
      .get(ApiRoutes.tasks.byId(taskId))
      .set(auth)
      .expect(HttpStatus.NOT_FOUND);

    expect(deletedTaskResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(deletedTaskResponse.body.message).toBe(TASK_NOT_FOUND_MESSAGE);

    const deleteListResponse = await request(server)
      .delete(ApiRoutes.lists.byId(listId))
      .set(auth)
      .expect(HttpStatus.OK);

    expect(deleteListResponse.body).toEqual({ success: true });

    const deletedListTasksResponse = await request(server)
      .get(ApiRoutes.lists.tasks(listId))
      .set(auth)
      .expect(HttpStatus.NOT_FOUND);

    expect(deletedListTasksResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(deletedListTasksResponse.body.message).toBe(LIST_NOT_FOUND_MESSAGE);
  });

  it('returns not found when another user accesses foreign lists and tasks', async () => {
    const server = app.getHttpServer();

    const owner = await registerThenLogin(server, buildRegisterPayload());
    const ownerAuth = buildBearerAuthorization(owner.accessToken);

    const listResponse = await request(server)
      .post(ApiRoutes.lists.base())
      .set(ownerAuth)
      .send(buildCreateListPayload())
      .expect(HttpStatus.CREATED);

    const listId = listResponse.body.id as string;

    const taskResponse = await request(server)
      .post(ApiRoutes.lists.tasks(listId))
      .set(ownerAuth)
      .send(buildCreateTaskPayload())
      .expect(HttpStatus.CREATED);

    const taskId = taskResponse.body.id as string;

    const foreign = await registerThenLogin(server, buildSecondaryRegisterPayload());
    expect(foreign.email).toBe(secondaryAuthUser.normalizedEmail);
    const foreignAuth = buildBearerAuthorization(foreign.accessToken);

    const getTasksResponse = await request(server)
      .get(ApiRoutes.lists.tasks(listId))
      .set(foreignAuth)
      .expect(HttpStatus.NOT_FOUND);

    expect(getTasksResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(getTasksResponse.body.message).toBe(LIST_NOT_FOUND_MESSAGE);

    const getTaskResponse = await request(server)
      .get(ApiRoutes.tasks.byId(taskId))
      .set(foreignAuth)
      .expect(HttpStatus.NOT_FOUND);

    expect(getTaskResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(getTaskResponse.body.message).toBe(TASK_NOT_FOUND_MESSAGE);

    const patchTaskResponse = await request(server)
      .patch(ApiRoutes.tasks.byId(taskId))
      .set(foreignAuth)
      .send({ shortDescription: listsTestData.updatedShortDescription })
      .expect(HttpStatus.NOT_FOUND);

    expect(patchTaskResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(patchTaskResponse.body.message).toBe(TASK_NOT_FOUND_MESSAGE);

    const patchStatusResponse = await request(server)
      .patch(ApiRoutes.tasks.status(taskId))
      .set(foreignAuth)
      .send({ completed: true })
      .expect(HttpStatus.NOT_FOUND);

    expect(patchStatusResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(patchStatusResponse.body.message).toBe(TASK_NOT_FOUND_MESSAGE);

    const deleteTaskResponse = await request(server)
      .delete(ApiRoutes.tasks.byId(taskId))
      .set(foreignAuth)
      .expect(HttpStatus.NOT_FOUND);

    expect(deleteTaskResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(deleteTaskResponse.body.message).toBe(TASK_NOT_FOUND_MESSAGE);

    const createOnForeignListResponse = await request(server)
      .post(ApiRoutes.lists.tasks(listId))
      .set(foreignAuth)
      .send(buildCreateTaskPayload())
      .expect(HttpStatus.NOT_FOUND);

    expect(createOnForeignListResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(createOnForeignListResponse.body.message).toBe(LIST_NOT_FOUND_MESSAGE);

    const deleteListResponse = await request(server)
      .delete(ApiRoutes.lists.byId(listId))
      .set(foreignAuth)
      .expect(HttpStatus.NOT_FOUND);

    expect(deleteListResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(deleteListResponse.body.message).toBe(LIST_NOT_FOUND_MESSAGE);
  });
});
