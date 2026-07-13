import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { ListsModule } from './lists/lists.module';
import { RealtimeModule } from './realtime/realtime.module';
import { TasksModule } from './tasks/tasks.module';
import { AppConfigModule } from './common/config/app-config.module';
import appConfig from './common/config/app.config';
import { envValidationSchema } from './common/config/env.validation';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema: envValidationSchema,
    }),
    AppConfigModule,
    ...(process.env.NODE_ENV !== 'test'
      ? [
          ThrottlerModule.forRoot({
            throttlers: [{ ttl: 60_000, limit: 100 }],
          }),
        ]
      : []),
    PrismaModule,
    HealthModule,
    RealtimeModule,
    AuthModule,
    ListsModule,
    TasksModule,
  ],
  providers: [
    ...(process.env.NODE_ENV !== 'test'
      ? [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]
      : []),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('{*path}');
  }
}
