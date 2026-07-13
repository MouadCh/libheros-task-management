import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'up' | 'down';
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();

    try {
      await this.prisma.ping();
      return { status: 'ok', database: 'up', timestamp };
    } catch {
      return { status: 'error', database: 'down', timestamp };
    }
  }
}
