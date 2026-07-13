import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { UserDto } from '@libheros/contracts';
import * as argon2 from 'argon2';
import { AppConfigService } from '../common/config/app-config.service';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCodes } from '../common/exceptions/error-codes';
import { normalizeEmail } from '../common/utils/normalize.util';
import { toUserDto } from '../users/users.mapper';
import { UsersRepository } from '../users/users.repository';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import {
  AUTH_DUPLICATE_EMAIL_MESSAGE,
  AUTH_INVALID_CREDENTIALS_MESSAGE,
} from './constants/auth.constants';
import { SessionsRepository } from './repositories/sessions.repository';
import {
  getRefreshTokenExpiryFromDecoded,
  createRefreshTokenPayload,
  type AccessTokenPayload,
  type RefreshTokenPayload,
} from './utils/token-payload.util';

export interface AuthResult {
  accessToken: string;
  user: UserDto;
  refreshToken: string;
}

export interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly jwtService: JwtService,
    private readonly appConfig: AppConfigService,
  ) {}

  async register(dto: RegisterDto, context: SessionContext): Promise<AuthResult> {
    const email = normalizeEmail(dto.email);
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new AppException(
        ErrorCodes.RESOURCE_CONFLICT,
        AUTH_DUPLICATE_EMAIL_MESSAGE,
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.usersRepository.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email,
      passwordHash,
    });

    return this.createAuthResult(user.id, toUserDto(user), context);
  }

  async login(dto: LoginDto, context: SessionContext): Promise<AuthResult> {
    const email = normalizeEmail(dto.email);
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new AppException(
        ErrorCodes.AUTH_UNAUTHORIZED,
        AUTH_INVALID_CREDENTIALS_MESSAGE,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!passwordValid) {
      throw new AppException(
        ErrorCodes.AUTH_UNAUTHORIZED,
        AUTH_INVALID_CREDENTIALS_MESSAGE,
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.createAuthResult(user.id, toUserDto(user), context);
  }

  async refresh(
    refreshToken: string | undefined,
  ): Promise<Pick<AuthResult, 'accessToken' | 'refreshToken'>> {
    if (!refreshToken) {
      throw new AppException(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Refresh token is missing',
        HttpStatus.UNAUTHORIZED,
      );
    }

    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.appConfig.jwtRefreshSecret,
      });
    } catch {
      await this.revokeSessionFromToken(refreshToken);
      throw new AppException(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const session = await this.sessionsRepository.findActiveById(payload.sid);

    if (!session || session.userId !== payload.sub) {
      await this.revokeSessionFromToken(refreshToken);
      throw new AppException(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokenMatches = await argon2.verify(session.refreshTokenHash, refreshToken);

    if (!tokenMatches) {
      await this.sessionsRepository.revoke(session.id);
      throw new AppException(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const rotated = await this.rotateRefreshToken(session.id, session.userId);

    return rotated;
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.revokeSessionFromToken(refreshToken);
  }

  async getMe(userId: string): Promise<UserDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new AppException(ErrorCodes.RESOURCE_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
    }

    return toUserDto(user);
  }

  private async createAuthResult(
    userId: string,
    user: UserDto,
    context: SessionContext,
  ): Promise<AuthResult> {
    const session = await this.sessionsRepository.create({
      userId,
      refreshTokenHash: '',
      expiresAt: new Date(),
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });

    const tokens = await this.issueTokens(userId, session.id);
    let expiresAt: Date;
    try {
      expiresAt = getRefreshTokenExpiryFromDecoded(this.jwtService.decode(tokens.refreshToken));
    } catch {
      throw new AppException(ErrorCodes.INTERNAL_ERROR, 'Failed to issue refresh token', 500);
    }

    await this.sessionsRepository.updateRefreshTokenHash(
      session.id,
      await argon2.hash(tokens.refreshToken, { type: argon2.argon2id }),
      expiresAt,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  private async rotateRefreshToken(
    sessionId: string,
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokens = await this.issueTokens(userId, sessionId);
    let expiresAt: Date;
    try {
      expiresAt = getRefreshTokenExpiryFromDecoded(this.jwtService.decode(tokens.refreshToken));
    } catch {
      throw new AppException(ErrorCodes.INTERNAL_ERROR, 'Failed to rotate refresh token', 500);
    }

    await this.sessionsRepository.updateRefreshTokenHash(
      sessionId,
      await argon2.hash(tokens.refreshToken, { type: argon2.argon2id }),
      expiresAt,
    );

    return tokens;
  }

  private async issueTokens(
    userId: string,
    sessionId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: AccessTokenPayload = { sub: userId };
    const refreshPayload = createRefreshTokenPayload(userId, sessionId);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.appConfig.jwtAccessSecret,
        expiresIn: this.appConfig.jwtAccessExpiresIn as JwtSignOptions['expiresIn'],
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.appConfig.jwtRefreshSecret,
        expiresIn: this.appConfig.jwtRefreshExpiresIn as JwtSignOptions['expiresIn'],
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async revokeSessionFromToken(refreshToken: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.appConfig.jwtRefreshSecret,
        ignoreExpiration: true,
      });
      const session = await this.sessionsRepository.findById(payload.sid);

      if (session && !session.revokedAt) {
        await this.sessionsRepository.revoke(session.id);
      }
    } catch {
      // Ignore malformed tokens during logout/revocation.
    }
  }
}
