import { Module, forwardRef } from '@nestjs/common';
import { ListsModule } from '../lists/lists.module';
import { TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

@Module({
  imports: [forwardRef(() => ListsModule)],
  controllers: [TasksController],
  providers: [TasksRepository, TasksService],
  exports: [TasksRepository, TasksService],
})
export class TasksModule {}
