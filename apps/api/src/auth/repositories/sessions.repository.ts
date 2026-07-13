import { Injectable } from '@nestjs/common';
import type { AuthSession } from '@prisma/client';
import { BaseRepository } from '../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateSessionInput {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class SessionsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  create(input: CreateSessionInput): Promise<AuthSession> {
    return this.prisma.authSession.create({ data: input });
  }

  findById(id: string): Promise<AuthSession | null> {
    return this.prisma.authSession.findUnique({ where: { id } });
  }

  findActiveById(id: string): Promise<AuthSession | null> {
    return this.prisma.authSession.findFirst({
      where: {
        id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  updateRefreshTokenHash(
    id: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<AuthSession> {
    return this.prisma.authSession.update({
      where: { id },
      data: { refreshTokenHash, expiresAt },
    });
  }

  revoke(id: string): Promise<AuthSession> {
    return this.prisma.authSession.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}
