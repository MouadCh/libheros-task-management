import type { UserDto } from '@libheros/contracts';
import type { User } from '@prisma/client';

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
