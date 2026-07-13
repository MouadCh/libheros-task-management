import { Injectable } from '@nestjs/common';
import type { TaskList } from '@prisma/client';
import { BaseRepository } from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateListInput {
  userId: string;
  name: string;
  normalizedName: string;
}

@Injectable()
export class ListsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findAllByUserId(userId: string): Promise<TaskList[]> {
    return this.prisma.taskList.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  findByIdForUser(listId: string, userId: string): Promise<TaskList | null> {
    return this.prisma.taskList.findFirst({
      where: { id: listId, userId },
    });
  }

  create(input: CreateListInput): Promise<TaskList> {
    return this.prisma.taskList.create({ data: input });
  }

  deleteByIdForUser(listId: string, userId: string): Promise<TaskList | null> {
    return this.prisma.$transaction(async (tx) => {
      const list = await tx.taskList.findFirst({ where: { id: listId, userId } });
      if (!list) {
        return null;
      }

      await tx.taskList.delete({ where: { id: listId } });
      return list;
    });
  }
}
