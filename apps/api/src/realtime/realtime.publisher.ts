import { Injectable } from '@nestjs/common';
import type { TaskDto, TaskListDto, TaskStatus } from '@libheros/contracts';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimePublisher {
  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  emitTaskCreated(listId: string, task: TaskDto): void {
    this.realtimeGateway.emitTaskCreated(listId, task);
  }

  emitTaskUpdated(listId: string, task: TaskDto): void {
    this.realtimeGateway.emitTaskUpdated(listId, task);
  }

  emitTaskDeleted(listId: string, taskId: string): void {
    this.realtimeGateway.emitTaskDeleted(listId, taskId);
  }

  emitTaskCompleted(
    listId: string,
    taskId: string,
    status: TaskStatus,
    completedAt: string | null,
  ): void {
    this.realtimeGateway.emitTaskCompleted(listId, taskId, status, completedAt);
  }

  emitListCreated(userId: string, list: TaskListDto): void {
    this.realtimeGateway.emitListCreated(userId, list);
  }

  emitListDeleted(userId: string, listId: string): void {
    this.realtimeGateway.emitListDeleted(userId, listId);
  }
}
