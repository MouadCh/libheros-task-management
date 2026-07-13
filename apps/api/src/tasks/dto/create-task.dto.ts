import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Buy groceries' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  shortDescription!: string;

  @ApiPropertyOptional({ example: 'Milk, eggs, bread' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  longDescription?: string;

  @ApiProperty({ example: '2026-12-31T12:00:00.000Z' })
  @IsDateString()
  dueDate!: string;
}
