import { IsUUID } from 'class-validator';
import type { ListJoinPayload } from '@libheros/contracts';

export class ListJoinDto implements ListJoinPayload {
  @IsUUID()
  listId!: string;
}
