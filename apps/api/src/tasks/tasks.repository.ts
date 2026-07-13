import { Injectable } from '@nestjs/common';
import { TaskStatus, type Task } from '@prisma/client';
import { BaseRepository } from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTaskInput {
  listId: string;
  shortDescription: string;
  longDescription?: string | null;
  dueDate: Date;
}

export interface UpdateTaskInput {
  shortDescription?: string;
  longDescription?: string | null;
  dueDate?: Date;
}

@Injectable()
export class TasksRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByListIdForUser(listId: string, userId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        listId,
        list: { userId },
      },
    });
  }

  findByIdForUser(taskId: string, userId: string): Promise<Task | null> {
    return this.prisma.task.findFirst({
      where: {
        id: taskId,
        list: { userId },
      },
    });
  }

  create(input: CreateTaskInput): Promise<Task> {
    return this.prisma.task.create({ data: input });
  }

  updateForUser(taskId: string, userId: string, input: UpdateTaskInput): Promise<Task | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.task.findFirst({
        where: { id: taskId, list: { userId } },
      });

      if (!existing) {
        return null;
      }

      return tx.task.update({
        where: { id: taskId },
        data: input,
      });
    });
  }

  updateStatusForUser(
    taskId: string,
    userId: string,
    status: TaskStatus,
    completedAt: Date | null,
  ): Promise<Task | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.task.findFirst({
        where: { id: taskId, list: { userId } },
      });

      if (!existing) {
        return null;
      }

      return tx.task.update({
        where: { id: taskId },
        data: { status, completedAt },
      });
    });
  }

  deleteByIdForUser(taskId: string, userId: string): Promise<Task | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.task.findFirst({
        where: { id: taskId, list: { userId } },
      });

      if (!existing) {
        return null;
      }

      await tx.task.delete({ where: { id: taskId } });
      return existing;
    });
  }
}
