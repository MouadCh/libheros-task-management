import { execSync } from 'node:child_process';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { PrismaService } from '../../src/prisma/prisma.service';

export async function ensureDatabaseReady(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    await prisma.$disconnect();
    throw new Error(
      'PostgreSQL is not available for e2e tests. Start it with `bun db:setup` from the repository root.',
    );
  }

  await prisma.$disconnect();

  execSync('bunx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'pipe',
    env: process.env,
  });
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.authSession.deleteMany();
  await prisma.user.deleteMany();
}
