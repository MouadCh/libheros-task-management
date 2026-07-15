import { HttpStatus, type INestApplication } from '@nestjs/common';
import { TaskStatus } from '@libheros/contracts';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ApiRoutes } from '../src/common/constants/api.constants';
import { ErrorCodes } from '../src/common/exceptions/error-codes';
import {
  LIST_DUPLICATE_NAME_MESSAGE,
  LIST_NOT_FOUND_MESSAGE,
} from '../src/lists/constants/lists.constants';
import { PrismaService } from '../src/prisma/prisma.service';
import { TASK_NOT_FOUND_MESSAGE } from '../src/tasks/constants/tasks.constants';
import { unknownListId } from '../src/testing/constants/e2e-resource.constants';
import {
  buildBearerAuthorization,
  buildRegisterPayload,
} from '../src/testing/fixtures/auth.fixture';
import {
  buildCreateListPayload,
  buildCreateTaskPayload,
  buildSecondaryRegisterPayload,
  listsTestData,
} from '../src/testing/fixtures/lists-tasks.fixture';
import { registerAndGetAccessToken } from './utils/auth.util';
import { createE2eApp } from './utils/create-e2e-app';
import { ensureDatabaseReady, resetDatabase } from './utils/database';

describe('Lists and Tasks (e2e)', () => {
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

  it('rejects unauthenticated requests to lists endpoints', async () => {
    const response = await request(app.getHttpServer())
      .get(ApiRoutes.lists.base())
      .expect(HttpStatus.UNAUTHORIZED);

    expect(response.body.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
  });

  it('creates, lists, and deletes a task list', async () => {
    const { accessToken } = await registerAndGetAccessToken(
      app.getHttpServer(),
      buildRegisterPayload(),
    );
    const auth = buildBearerAuthorization(accessToken);

    const createResponse = await request(app.getHttpServer())
      .post(ApiRoutes.lists.base())
      .set(auth)
      .send(buildCreateListPayload())
      .expect(HttpStatus.CREATED);

    expect(createResponse.body).toMatchObject({
      id: expect.any(String),
      name: listsTestData.listName,
    });

    const listId = createResponse.body.id as string;

    const listAllResponse = await request(app.getHttpServer())
      .get(ApiRoutes.lists.base())
      .set(auth)
      .expect(HttpStatus.OK);

    expect(listAllResponse.body).toHaveLength(1);
    expect(listAllResponse.body[0]).toMatchObject({
      id: listId,
      name: listsTestData.listName,
    });

    const deleteResponse = await request(app.getHttpServer())
      .delete(ApiRoutes.lists.byId(listId))
      .set(auth)
      .expect(HttpStatus.OK);

    expect(deleteResponse.body).toEqual({ success: true });

    const listAfterDelete = await request(app.getHttpServer())
      .get(ApiRoutes.lists.base())
      .set(auth)
      .expect(HttpStatus.OK);

    expect(listAfterDelete.body).toHaveLength(0);
  });

  it('rejects duplicate list names with conflict', async () => {
    const { accessToken } = await registerAndGetAccessToken(
      app.getHttpServer(),
      buildRegisterPayload(),
    );
    const auth = buildBearerAuthorization(accessToken);

    await request(app.getHttpServer())
      .post(ApiRoutes.lists.base())
      .set(auth)
      .send(buildCreateListPayload())
      .expect(HttpStatus.CREATED);

    const duplicateResponse = await request(app.getHttpServer())
      .post(ApiRoutes.lists.base())
      .set(auth)
      .send(buildCreateListPayload({ name: listsTestData.duplicateListName }))
      .expect(HttpStatus.CONFLICT);

    expect(duplicateResponse.body.code).toBe(ErrorCodes.RESOURCE_CONFLICT);
    expect(duplicateResponse.body.message).toBe(LIST_DUPLICATE_NAME_MESSAGE);
  });

  it('returns not found when deleting an unknown list', async () => {
    const { accessToken } = await registerAndGetAccessToken(
      app.getHttpServer(),
      buildRegisterPayload(),
    );
    const auth = buildBearerAuthorization(accessToken);

    const response = await request(app.getHttpServer())
      .delete(ApiRoutes.lists.byId(unknownListId))
      .set(auth)
      .expect(HttpStatus.NOT_FOUND);

    expect(response.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(response.body.message).toBe(LIST_NOT_FOUND_MESSAGE);
  });

  it('creates, lists, gets, updates, completes, restores, and deletes a task', async () => {
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

    const createTaskResponse = await request(app.getHttpServer())
      .post(ApiRoutes.lists.tasks(listId))
      .set(auth)
      .send(buildCreateTaskPayload())
      .expect(HttpStatus.CREATED);

    expect(createTaskResponse.body).toMatchObject({
      id: expect.any(String),
      listId,
      shortDescription: listsTestData.taskShortDescription,
      dueDate: listsTestData.taskDueDate,
      status: TaskStatus.ACTIVE,
      completedAt: null,
    });

    const taskId = createTaskResponse.body.id as string;

    const listTasksResponse = await request(app.getHttpServer())
      .get(ApiRoutes.lists.tasks(listId))
      .set(auth)
      .expect(HttpStatus.OK);

    expect(listTasksResponse.body).toHaveLength(1);
    expect(listTasksResponse.body[0].id).toBe(taskId);

    const getTaskResponse = await request(app.getHttpServer())
      .get(ApiRoutes.tasks.byId(taskId))
      .set(auth)
      .expect(HttpStatus.OK);

    expect(getTaskResponse.body.id).toBe(taskId);

    const updateResponse = await request(app.getHttpServer())
      .patch(ApiRoutes.tasks.byId(taskId))
      .set(auth)
      .send({ shortDescription: listsTestData.updatedShortDescription })
      .expect(HttpStatus.OK);

    expect(updateResponse.body.shortDescription).toBe(listsTestData.updatedShortDescription);

    const completeResponse = await request(app.getHttpServer())
      .patch(ApiRoutes.tasks.status(taskId))
      .set(auth)
      .send({ completed: true })
      .expect(HttpStatus.OK);

    expect(completeResponse.body.status).toBe(TaskStatus.COMPLETED);
    expect(completeResponse.body.completedAt).toEqual(expect.any(String));

    const restoreResponse = await request(app.getHttpServer())
      .patch(ApiRoutes.tasks.status(taskId))
      .set(auth)
      .send({ completed: false })
      .expect(HttpStatus.OK);

    expect(restoreResponse.body.status).toBe(TaskStatus.ACTIVE);
    expect(restoreResponse.body.completedAt).toBeNull();

    const deleteResponse = await request(app.getHttpServer())
      .delete(ApiRoutes.tasks.byId(taskId))
      .set(auth)
      .expect(HttpStatus.OK);

    expect(deleteResponse.body).toEqual({ success: true });

    const notFoundResponse = await request(app.getHttpServer())
      .get(ApiRoutes.tasks.byId(taskId))
      .set(auth)
      .expect(HttpStatus.NOT_FOUND);

    expect(notFoundResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(notFoundResponse.body.message).toBe(TASK_NOT_FOUND_MESSAGE);
  });

  it('orders active tasks by due date then created date', async () => {
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

    await request(app.getHttpServer())
      .post(ApiRoutes.lists.tasks(listId))
      .set(auth)
      .send(
        buildCreateTaskPayload({
          shortDescription: listsTestData.secondTaskShortDescription,
          dueDate: listsTestData.taskDueDateLater,
        }),
      )
      .expect(HttpStatus.CREATED);

    await request(app.getHttpServer())
      .post(ApiRoutes.lists.tasks(listId))
      .set(auth)
      .send(
        buildCreateTaskPayload({
          shortDescription: listsTestData.taskShortDescription,
          dueDate: listsTestData.taskDueDateEarlier,
        }),
      )
      .expect(HttpStatus.CREATED);

    const listTasksResponse = await request(app.getHttpServer())
      .get(ApiRoutes.lists.tasks(listId))
      .set(auth)
      .expect(HttpStatus.OK);

    expect(listTasksResponse.body).toHaveLength(2);
    expect(listTasksResponse.body[0].shortDescription).toBe(listsTestData.taskShortDescription);
    expect(listTasksResponse.body[1].shortDescription).toBe(
      listsTestData.secondTaskShortDescription,
    );
  });

  it('returns not found when another user accesses a foreign list', async () => {
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
    const secondaryAuth = buildBearerAuthorization(secondary.accessToken);

    const getTasksResponse = await request(app.getHttpServer())
      .get(ApiRoutes.lists.tasks(listId))
      .set(secondaryAuth)
      .expect(HttpStatus.NOT_FOUND);

    expect(getTasksResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(getTasksResponse.body.message).toBe(LIST_NOT_FOUND_MESSAGE);

    const deleteListResponse = await request(app.getHttpServer())
      .delete(ApiRoutes.lists.byId(listId))
      .set(secondaryAuth)
      .expect(HttpStatus.NOT_FOUND);

    expect(deleteListResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(deleteListResponse.body.message).toBe(LIST_NOT_FOUND_MESSAGE);
  });

  it('returns not found when another user accesses a foreign task', async () => {
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

    const taskResponse = await request(app.getHttpServer())
      .post(ApiRoutes.lists.tasks(listId))
      .set(buildBearerAuthorization(primary.accessToken))
      .send(buildCreateTaskPayload())
      .expect(HttpStatus.CREATED);

    const taskId = taskResponse.body.id as string;
    const secondaryAuth = buildBearerAuthorization(secondary.accessToken);

    const getTaskResponse = await request(app.getHttpServer())
      .get(ApiRoutes.tasks.byId(taskId))
      .set(secondaryAuth)
      .expect(HttpStatus.NOT_FOUND);

    expect(getTaskResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(getTaskResponse.body.message).toBe(TASK_NOT_FOUND_MESSAGE);

    const updateResponse = await request(app.getHttpServer())
      .patch(ApiRoutes.tasks.byId(taskId))
      .set(secondaryAuth)
      .send({ shortDescription: listsTestData.updatedShortDescription })
      .expect(HttpStatus.NOT_FOUND);

    expect(updateResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(updateResponse.body.message).toBe(TASK_NOT_FOUND_MESSAGE);

    const deleteResponse = await request(app.getHttpServer())
      .delete(ApiRoutes.tasks.byId(taskId))
      .set(secondaryAuth)
      .expect(HttpStatus.NOT_FOUND);

    expect(deleteResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(deleteResponse.body.message).toBe(TASK_NOT_FOUND_MESSAGE);
  });

  it('returns not found when another user creates a task in a foreign list', async () => {
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

    const createTaskResponse = await request(app.getHttpServer())
      .post(ApiRoutes.lists.tasks(listId))
      .set(buildBearerAuthorization(secondary.accessToken))
      .send(buildCreateTaskPayload())
      .expect(HttpStatus.NOT_FOUND);

    expect(createTaskResponse.body.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(createTaskResponse.body.message).toBe(LIST_NOT_FOUND_MESSAGE);
  });
});
