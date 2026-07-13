import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { TaskDto, TaskListDto } from '@libheros/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateListDto } from './dto/create-list.dto';
import { ListsService } from './lists.service';
import { CreateTaskDto } from '../tasks/dto/create-task.dto';
import { TasksService } from '../tasks/tasks.service';

@ApiTags('lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lists')
export class ListsController {
  constructor(
    private readonly listsService: ListsService,
    private readonly tasksService: TasksService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List task lists for the authenticated user' })
  @ApiOkResponse({ description: 'Task lists owned by the authenticated user' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<TaskListDto[]> {
    return this.listsService.findAll(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task list' })
  @ApiCreatedResponse({ description: 'Task list created' })
  @ApiConflictResponse({ description: 'Duplicate list name for this user' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateListDto): Promise<TaskListDto> {
    return this.listsService.create(user.userId, dto);
  }

  @Delete(':listId')
  @ApiOperation({ summary: 'Delete a task list and its tasks' })
  @ApiOkResponse({ description: 'Task list deleted' })
  @ApiNotFoundResponse({ description: 'List not found for this user' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listId', ParseUUIDPipe) listId: string,
  ): Promise<{ success: true }> {
    return this.listsService.delete(user.userId, listId).then(() => ({ success: true }));
  }

  @Get(':listId/tasks')
  @ApiOperation({ summary: 'List tasks for an owned task list' })
  @ApiOkResponse({ description: 'Tasks for the list in stable order' })
  @ApiNotFoundResponse({ description: 'List not found for this user' })
  findTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listId', ParseUUIDPipe) listId: string,
  ): Promise<TaskDto[]> {
    return this.tasksService.findByListId(user.userId, listId);
  }

  @Post(':listId/tasks')
  @ApiOperation({ summary: 'Create a task in an owned list' })
  @ApiCreatedResponse({ description: 'Task created' })
  @ApiNotFoundResponse({ description: 'List not found for this user' })
  createTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskDto> {
    return this.tasksService.create(user.userId, listId, dto);
  }
}
