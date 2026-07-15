import { IsUUID } from 'class-validator';
import type { ListLeavePayload } from '@libheros/contracts';

export class ListLeaveDto implements ListLeavePayload {
  @IsUUID()
  listId!: string;
}
