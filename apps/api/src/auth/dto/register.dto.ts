import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'fieldsMatch', async: false })
class FieldsMatchConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const object = args.object as Record<string, string>;
    const [relatedPropertyName] = args.constraints as [string];
    return object[args.property] === object[relatedPropertyName];
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints as [string];
    return `${args.property} must match ${relatedPropertyName}`;
  }
}

export class RegisterDto {
  @ApiProperty({ example: 'Jean' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'jean.dupont@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'jean.dupont@example.com' })
  @IsEmail()
  @Validate(FieldsMatchConstraint, ['email'])
  emailConfirmation!: string;

  @ApiProperty({ example: 'SecurePass1', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password!: string;

  @ApiProperty({ example: 'SecurePass1' })
  @IsString()
  @Validate(FieldsMatchConstraint, ['password'])
  passwordConfirmation!: string;
}
