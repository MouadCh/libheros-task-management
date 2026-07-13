import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { TaskDto } from '@libheros/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get(':taskId')
  @ApiOperation({ summary: 'Get a task owned by the authenticated user' })
  @ApiOkResponse({ description: 'Task details' })
  @ApiNotFoundResponse({ description: 'Task not found for this user' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<TaskDto> {
    return this.tasksService.findById(user.userId, taskId);
  }

  @Patch(':taskId')
  @ApiOperation({ summary: 'Update a task owned by the authenticated user' })
  @ApiOkResponse({ description: 'Updated task' })
  @ApiNotFoundResponse({ description: 'Task not found for this user' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskDto> {
    return this.tasksService.update(user.userId, taskId, dto);
  }

  @Patch(':taskId/status')
  @ApiOperation({ summary: 'Update task completion status' })
  @ApiOkResponse({ description: 'Updated task status' })
  @ApiNotFoundResponse({ description: 'Task not found for this user' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskStatusDto,
  ): Promise<TaskDto> {
    return this.tasksService.updateStatus(user.userId, taskId, dto);
  }

  @Delete(':taskId')
  @ApiOperation({ summary: 'Delete a task owned by the authenticated user' })
  @ApiOkResponse({ description: 'Task deleted' })
  @ApiNotFoundResponse({ description: 'Task not found for this user' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<{ success: true }> {
    return this.tasksService.delete(user.userId, taskId).then(() => ({ success: true }));
  }
}
