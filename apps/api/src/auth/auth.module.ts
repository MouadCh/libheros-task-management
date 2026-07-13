import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionsRepository } from './repositories/sessions.repository';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';

const PASSWORD_STRATEGY = 'jwt-access';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: PASSWORD_STRATEGY }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionsRepository, JwtAccessStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
