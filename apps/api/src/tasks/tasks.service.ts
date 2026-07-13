import { HttpStatus, Injectable } from '@nestjs/common';
import { TaskStatus, type TaskDto } from '@libheros/contracts';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCodes } from '../common/exceptions/error-codes';
import { LIST_NOT_FOUND_MESSAGE } from '../lists/constants/lists.constants';
import { ListsRepository } from '../lists/lists.repository';
import { RealtimePublisher } from '../realtime/realtime.publisher';
import { TASK_NOT_FOUND_MESSAGE } from './constants/tasks.constants';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';
import type { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { sortTasksForList, toTaskDto } from './tasks.mapper';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(
    private readonly listsRepository: ListsRepository,
    private readonly tasksRepository: TasksRepository,
    private readonly realtimePublisher: RealtimePublisher,
  ) {}

  async findByListId(userId: string, listId: string): Promise<TaskDto[]> {
    await this.ensureListOwnership(listId, userId);
    const tasks = await this.tasksRepository.findByListIdForUser(listId, userId);
    return sortTasksForList(tasks).map(toTaskDto);
  }

  async create(userId: string, listId: string, dto: CreateTaskDto): Promise<TaskDto> {
    await this.ensureListOwnership(listId, userId);

    const task = await this.tasksRepository.create({
      listId,
      shortDescription: dto.shortDescription.trim(),
      longDescription: dto.longDescription?.trim() ?? null,
      dueDate: new Date(dto.dueDate),
    });

    const taskDto = toTaskDto(task);
    this.realtimePublisher.emitTaskCreated(listId, taskDto);
    return taskDto;
  }

  async findById(userId: string, taskId: string): Promise<TaskDto> {
    const task = await this.tasksRepository.findByIdForUser(taskId, userId);

    if (!task) {
      throw new AppException(
        ErrorCodes.RESOURCE_NOT_FOUND,
        TASK_NOT_FOUND_MESSAGE,
        HttpStatus.NOT_FOUND,
      );
    }

    return toTaskDto(task);
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto): Promise<TaskDto> {
    const task = await this.tasksRepository.updateForUser(taskId, userId, {
      ...(dto.shortDescription !== undefined
        ? { shortDescription: dto.shortDescription.trim() }
        : {}),
      ...(dto.longDescription !== undefined ? { longDescription: dto.longDescription } : {}),
      ...(dto.dueDate !== undefined ? { dueDate: new Date(dto.dueDate) } : {}),
    });

    if (!task) {
      throw new AppException(
        ErrorCodes.RESOURCE_NOT_FOUND,
        TASK_NOT_FOUND_MESSAGE,
        HttpStatus.NOT_FOUND,
      );
    }

    const taskDto = toTaskDto(task);
    this.realtimePublisher.emitTaskUpdated(task.listId, taskDto);
    return taskDto;
  }

  async updateStatus(userId: string, taskId: string, dto: UpdateTaskStatusDto): Promise<TaskDto> {
    if (dto.status === undefined && dto.completed === undefined) {
      throw new AppException(
        ErrorCodes.VALIDATION_ERROR,
        'Either status or completed must be provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    const nextStatus = this.resolveStatus(dto);
    const completedAt = nextStatus === TaskStatus.COMPLETED ? new Date() : null;

    const task = await this.tasksRepository.updateStatusForUser(
      taskId,
      userId,
      nextStatus,
      completedAt,
    );

    if (!task) {
      throw new AppException(
        ErrorCodes.RESOURCE_NOT_FOUND,
        TASK_NOT_FOUND_MESSAGE,
        HttpStatus.NOT_FOUND,
      );
    }

    const taskDto = toTaskDto(task);
    this.realtimePublisher.emitTaskCompleted(
      task.listId,
      task.id,
      taskDto.status,
      taskDto.completedAt,
    );

    if (nextStatus === TaskStatus.ACTIVE) {
      this.realtimePublisher.emitTaskUpdated(task.listId, taskDto);
    }

    return taskDto;
  }

  async delete(userId: string, taskId: string): Promise<void> {
    const task = await this.tasksRepository.deleteByIdForUser(taskId, userId);

    if (!task) {
      throw new AppException(
        ErrorCodes.RESOURCE_NOT_FOUND,
        TASK_NOT_FOUND_MESSAGE,
        HttpStatus.NOT_FOUND,
      );
    }

    this.realtimePublisher.emitTaskDeleted(task.listId, task.id);
  }

  private async ensureListOwnership(listId: string, userId: string): Promise<void> {
    const list = await this.listsRepository.findByIdForUser(listId, userId);

    if (!list) {
      throw new AppException(
        ErrorCodes.RESOURCE_NOT_FOUND,
        LIST_NOT_FOUND_MESSAGE,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private resolveStatus(dto: UpdateTaskStatusDto): TaskStatus {
    if (dto.completed !== undefined) {
      return dto.completed ? TaskStatus.COMPLETED : TaskStatus.ACTIVE;
    }

    return dto.status ?? TaskStatus.ACTIVE;
  }
}
