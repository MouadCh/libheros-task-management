import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateListDto {
  @ApiProperty({ example: 'Courses' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
