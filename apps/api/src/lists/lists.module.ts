import { Module, forwardRef } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { ListsController } from './lists.controller';
import { ListsRepository } from './lists.repository';
import { ListsService } from './lists.service';

@Module({
  imports: [forwardRef(() => TasksModule)],
  controllers: [ListsController],
  providers: [ListsRepository, ListsService],
  exports: [ListsRepository, ListsService],
})
export class ListsModule {}
