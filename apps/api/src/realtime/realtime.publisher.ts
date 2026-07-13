import { Injectable } from '@nestjs/common';
import type { TaskDto, TaskListDto, TaskStatus } from '@libheros/contracts';

@Injectable()
export class RealtimePublisher {
  emitTaskCreated(_listId: string, _task: TaskDto): void {}

  emitTaskUpdated(_listId: string, _task: TaskDto): void {}

  emitTaskDeleted(_listId: string, _taskId: string): void {}

  emitTaskCompleted(
    _listId: string,
    _taskId: string,
    _status: TaskStatus,
    _completedAt: string | null,
  ): void {}

  emitListCreated(_userId: string, _list: TaskListDto): void {}

  emitListDeleted(_userId: string, _listId: string): void {}
}
