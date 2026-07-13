import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { TaskListDto } from '@libheros/contracts';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCodes } from '../common/exceptions/error-codes';
import { normalizeListName } from '../common/utils/normalize.util';
import { RealtimePublisher } from '../realtime/realtime.publisher';
import { LIST_DUPLICATE_NAME_MESSAGE, LIST_NOT_FOUND_MESSAGE } from './constants/lists.constants';
import type { CreateListDto } from './dto/create-list.dto';
import { toTaskListDto } from './lists.mapper';
import { ListsRepository } from './lists.repository';

@Injectable()
export class ListsService {
  constructor(
    private readonly listsRepository: ListsRepository,
    private readonly realtimePublisher: RealtimePublisher,
  ) {}

  async findAll(userId: string): Promise<TaskListDto[]> {
    const lists = await this.listsRepository.findAllByUserId(userId);
    return lists.map(toTaskListDto);
  }

  async create(userId: string, dto: CreateListDto): Promise<TaskListDto> {
    const name = dto.name.trim();

    if (!name) {
      throw new AppException(
        ErrorCodes.VALIDATION_ERROR,
        'List name is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const list = await this.listsRepository.create({
        userId,
        name,
        normalizedName: normalizeListName(name),
      });
      const listDto = toTaskListDto(list);
      this.realtimePublisher.emitListCreated(userId, listDto);
      return listDto;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(
          ErrorCodes.RESOURCE_CONFLICT,
          LIST_DUPLICATE_NAME_MESSAGE,
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  async delete(userId: string, listId: string): Promise<void> {
    const deleted = await this.listsRepository.deleteByIdForUser(listId, userId);

    if (!deleted) {
      throw new AppException(
        ErrorCodes.RESOURCE_NOT_FOUND,
        LIST_NOT_FOUND_MESSAGE,
        HttpStatus.NOT_FOUND,
      );
    }

    this.realtimePublisher.emitListDeleted(userId, listId);
  }
}
