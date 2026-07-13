import { HttpStatus, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { envValidationSchema } from '../src/common/config/env.validation';
import { API_GLOBAL_PREFIX, ApiRoutes } from '../src/common/constants/api.constants';
import { HealthModule } from '../src/health/health.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validationSchema: envValidationSchema,
        }),
        PrismaModule,
        HealthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({
        ping: jest.fn().mockResolvedValue(true),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(API_GLOBAL_PREFIX);
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it(`GET ${ApiRoutes.health()} returns ok when database is up`, async () => {
    const response = await request(app.getHttpServer())
      .get(ApiRoutes.health())
      .expect(HttpStatus.OK);

    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('up');
    expect(response.body.timestamp).toBeDefined();
  });
});
