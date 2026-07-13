import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@libheros/contracts';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'statusOrCompletedProvided', async: false })
class StatusOrCompletedProvidedConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const object = args.object as UpdateTaskStatusDto;
    return object.status !== undefined || object.completed !== undefined;
  }

  defaultMessage(): string {
    return 'Either status or completed must be provided';
  }
}

export class UpdateTaskStatusDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  @Validate(StatusOrCompletedProvidedConstraint)
  status?: TaskStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
