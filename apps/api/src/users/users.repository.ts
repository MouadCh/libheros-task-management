import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { BaseRepository } from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
}

@Injectable()
export class UsersRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({ data: input });
  }
}
