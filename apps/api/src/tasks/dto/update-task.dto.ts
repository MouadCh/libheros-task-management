import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Updated task title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  shortDescription?: string;

  @ApiPropertyOptional({ example: 'Updated details' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  longDescription?: string | null;

  @ApiPropertyOptional({ example: '2026-12-31T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
