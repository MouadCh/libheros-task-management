import { ApiProperty } from '@nestjs/swagger';
import type { UserDto } from '@libheros/contracts';

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  user!: UserDto;
}
