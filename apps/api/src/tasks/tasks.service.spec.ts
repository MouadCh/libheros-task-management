import { TaskStatus } from '@libheros/contracts';
import type { Task, TaskList } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCodes } from '../common/exceptions/error-codes';
import { ListsRepository } from '../lists/lists.repository';
import { RealtimePublisher } from '../realtime/realtime.publisher';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';

describe('TasksService', () => {
  let tasksService: TasksService;
  let listsRepository: jest.Mocked<ListsRepository>;
  let tasksRepository: jest.Mocked<TasksRepository>;
  let realtimePublisher: jest.Mocked<RealtimePublisher>;

  const userId = 'user-1';
  const otherUserId = 'user-2';
  const listId = 'list-1';

  const list: TaskList = {
    id: listId,
    userId,
    name: 'Courses',
    normalizedName: 'courses',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const task: Task = {
    id: 'task-1',
    listId,
    shortDescription: 'Buy milk',
    longDescription: null,
    dueDate: new Date('2026-12-31T12:00:00.000Z'),
    status: TaskStatus.ACTIVE,
    completedAt: null,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    listsRepository = {
      findByIdForUser: jest.fn(),
      findAllByUserId: jest.fn(),
      create: jest.fn(),
      deleteByIdForUser: jest.fn(),
    } as unknown as jest.Mocked<ListsRepository>;

    tasksRepository = {
      findByListIdForUser: jest.fn(),
      findByIdForUser: jest.fn(),
      create: jest.fn(),
      updateForUser: jest.fn(),
      updateStatusForUser: jest.fn(),
      deleteByIdForUser: jest.fn(),
    } as unknown as jest.Mocked<TasksRepository>;

    realtimePublisher = {
      emitTaskCreated: jest.fn(),
      emitTaskUpdated: jest.fn(),
      emitTaskDeleted: jest.fn(),
      emitTaskCompleted: jest.fn(),
      emitListCreated: jest.fn(),
      emitListDeleted: jest.fn(),
    } as unknown as jest.Mocked<RealtimePublisher>;

    tasksService = new TasksService(listsRepository, tasksRepository, realtimePublisher);
  });

  it('creates a task for an owned list', async () => {
    listsRepository.findByIdForUser.mockResolvedValue(list);
    tasksRepository.create.mockResolvedValue(task);

    const result = await tasksService.create(userId, listId, {
      shortDescription: 'Buy milk',
      dueDate: '2026-12-31T12:00:00.000Z',
    });

    expect(result.id).toBe(task.id);
    expect(tasksRepository.create).toHaveBeenCalled();
    expect(realtimePublisher.emitTaskCreated).toHaveBeenCalledWith(listId, result);
  });

  it('rejects task creation for a foreign list', async () => {
    listsRepository.findByIdForUser.mockResolvedValue(null);

    await expect(
      tasksService.create(otherUserId, listId, {
        shortDescription: 'Buy milk',
        dueDate: '2026-12-31T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.RESOURCE_NOT_FOUND });

    expect(tasksRepository.create).not.toHaveBeenCalled();
    expect(realtimePublisher.emitTaskCreated).not.toHaveBeenCalled();
  });

  it('updates an owned task', async () => {
    const updatedTask = { ...task, shortDescription: 'Buy eggs' };
    tasksRepository.updateForUser.mockResolvedValue(updatedTask);

    const result = await tasksService.update(userId, task.id, { shortDescription: 'Buy eggs' });

    expect(result.shortDescription).toBe('Buy eggs');
    expect(realtimePublisher.emitTaskUpdated).toHaveBeenCalledWith(listId, result);
  });

  it('completes a task', async () => {
    const completedTask = {
      ...task,
      status: TaskStatus.COMPLETED,
      completedAt: new Date('2026-01-03T00:00:00.000Z'),
    };
    tasksRepository.updateStatusForUser.mockResolvedValue(completedTask);

    const result = await tasksService.updateStatus(userId, task.id, { completed: true });

    expect(result.status).toBe(TaskStatus.COMPLETED);
    expect(result.completedAt).not.toBeNull();
    expect(realtimePublisher.emitTaskCompleted).toHaveBeenCalled();
  });

  it('restores a completed task to active', async () => {
    const restoredTask = { ...task, status: TaskStatus.ACTIVE, completedAt: null };
    tasksRepository.updateStatusForUser.mockResolvedValue(restoredTask);

    const result = await tasksService.updateStatus(userId, task.id, { completed: false });

    expect(result.status).toBe(TaskStatus.ACTIVE);
    expect(result.completedAt).toBeNull();
    expect(realtimePublisher.emitTaskUpdated).toHaveBeenCalled();
  });

  it('deletes an owned task', async () => {
    tasksRepository.deleteByIdForUser.mockResolvedValue(task);

    await tasksService.delete(userId, task.id);

    expect(realtimePublisher.emitTaskDeleted).toHaveBeenCalledWith(listId, task.id);
  });

  it('never exposes another user task', async () => {
    tasksRepository.findByIdForUser.mockResolvedValue(null);

    await expect(tasksService.findById(otherUserId, task.id)).rejects.toBeInstanceOf(AppException);
  });

  it('emits websocket events only after successful persistence', async () => {
    listsRepository.findByIdForUser.mockResolvedValue(list);
    tasksRepository.create.mockRejectedValue(new Error('db failure'));

    await expect(
      tasksService.create(userId, listId, {
        shortDescription: 'Buy milk',
        dueDate: '2026-12-31T12:00:00.000Z',
      }),
    ).rejects.toThrow('db failure');

    expect(realtimePublisher.emitTaskCreated).not.toHaveBeenCalled();
  });
});
