import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import { AppConfigService } from '../common/config/app-config.service';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCodes } from '../common/exceptions/error-codes';
import { UsersRepository } from '../users/users.repository';
import { AUTH_INVALID_CREDENTIALS_MESSAGE } from './constants/auth.constants';
import { AuthService } from './auth.service';
import { authTestUser } from '../testing/fixtures/auth.fixture';
import { SessionsRepository } from './repositories/sessions.repository';

jest.mock('argon2');

describe('AuthService', () => {
  let authService: AuthService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let sessionsRepository: jest.Mocked<SessionsRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let appConfig: jest.Mocked<AppConfigService>;

  const user: User = {
    id: 'user-1',
    firstName: authTestUser.firstName,
    lastName: authTestUser.lastName,
    email: authTestUser.normalizedEmail,
    passwordHash: 'hashed-password',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    usersRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    sessionsRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findActiveById: jest.fn(),
      updateRefreshTokenHash: jest.fn(),
      revoke: jest.fn(),
    } as unknown as jest.Mocked<SessionsRepository>;

    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    appConfig = {
      jwtAccessSecret: 'access-secret-32-characters-min',
      jwtAccessExpiresIn: '15m',
      jwtRefreshSecret: 'refresh-secret-32-characters-min',
      jwtRefreshExpiresIn: '7d',
    } as unknown as jest.Mocked<AppConfigService>;

    authService = new AuthService(usersRepository, sessionsRepository, jwtService, appConfig);

    (argon2.hash as jest.Mock).mockResolvedValue('hashed-token');
    (argon2.verify as jest.Mock).mockImplementation(async (hash: string, plain: string) => {
      if (hash === user.passwordHash) {
        return plain === authTestUser.password;
      }
      return hash === 'hashed-token' && plain === 'refresh-token';
    });
  });

  describe('register', () => {
    it('registers a user and returns auth tokens', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(user);
      sessionsRepository.create.mockResolvedValue({
        id: 'session-1',
        userId: user.id,
        refreshTokenHash: '',
        expiresAt: new Date(),
        revokedAt: null,
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

      const result = await authService.register(
        {
          firstName: authTestUser.firstName,
          lastName: authTestUser.lastName,
          email: authTestUser.rawEmail,
          emailConfirmation: authTestUser.rawEmail,
          password: authTestUser.password,
          passwordConfirmation: authTestUser.password,
        },
        {},
      );

      expect(usersRepository.create).toHaveBeenCalledWith({
        firstName: authTestUser.firstName,
        lastName: authTestUser.lastName,
        email: authTestUser.normalizedEmail,
        passwordHash: 'hashed-token',
      });
      expect(argon2.hash).toHaveBeenCalledWith(authTestUser.password, { type: argon2.argon2id });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe(authTestUser.normalizedEmail);
    });

    it('throws conflict for duplicate email', async () => {
      usersRepository.findByEmail.mockResolvedValue(user);

      await expect(
        authService.register(
          {
            firstName: authTestUser.firstName,
            lastName: authTestUser.lastName,
            email: authTestUser.normalizedEmail,
            emailConfirmation: authTestUser.normalizedEmail,
            password: authTestUser.password,
            passwordConfirmation: authTestUser.password,
          },
          {},
        ),
      ).rejects.toMatchObject({
        code: ErrorCodes.RESOURCE_CONFLICT,
        getStatus: expect.any(Function),
      });
    });
  });

  describe('login', () => {
    it('logs in with valid credentials', async () => {
      usersRepository.findByEmail.mockResolvedValue(user);
      sessionsRepository.create.mockResolvedValue({
        id: 'session-1',
        userId: user.id,
        refreshTokenHash: '',
        expiresAt: new Date(),
        revokedAt: null,
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

      const result = await authService.login(
        { email: authTestUser.normalizedEmail, password: authTestUser.password },
        {},
      );

      expect(result.accessToken).toBe('access-token');
      expect(result.user.id).toBe(user.id);
    });

    it('rejects invalid login without revealing account existence details', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login(
          { email: authTestUser.missingEmail, password: authTestUser.password },
          {},
        ),
      ).rejects.toMatchObject({
        code: ErrorCodes.AUTH_UNAUTHORIZED,
        message: AUTH_INVALID_CREDENTIALS_MESSAGE,
      });
    });

    it('rejects invalid password with the same generic message', async () => {
      usersRepository.findByEmail.mockResolvedValue(user);

      await expect(
        authService.login({ email: authTestUser.normalizedEmail, password: 'wrong-password' }, {}),
      ).rejects.toMatchObject({
        code: ErrorCodes.AUTH_UNAUTHORIZED,
        message: AUTH_INVALID_CREDENTIALS_MESSAGE,
      });
    });
  });

  describe('refresh', () => {
    const activeSession = {
      id: 'session-1',
      userId: user.id,
      refreshTokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      userAgent: null,
      ipAddress: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('rotates refresh token and returns a new access token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: user.id, sid: activeSession.id });
      sessionsRepository.findActiveById.mockResolvedValue(activeSession);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

      const result = await authService.refresh('refresh-token');

      expect(sessionsRepository.updateRefreshTokenHash).toHaveBeenCalled();
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('rejects invalid refresh token and revokes the session when possible', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
      jwtService.verifyAsync.mockRejectedValueOnce(new Error('invalid'));

      await expect(authService.refresh('bad-token')).rejects.toBeInstanceOf(AppException);
    });

    it('rejects revoked refresh token reuse', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: user.id, sid: activeSession.id });
      sessionsRepository.findActiveById.mockResolvedValue(activeSession);
      (argon2.verify as jest.Mock).mockResolvedValueOnce(false);

      await expect(authService.refresh('refresh-token')).rejects.toMatchObject({
        code: ErrorCodes.AUTH_INVALID_TOKEN,
      });
      expect(sessionsRepository.revoke).toHaveBeenCalledWith(activeSession.id);
    });
  });

  describe('logout', () => {
    it('revokes the active session', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: user.id, sid: 'session-1' });
      sessionsRepository.findById.mockResolvedValue({
        id: 'session-1',
        userId: user.id,
        refreshTokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await authService.logout('refresh-token');

      expect(sessionsRepository.revoke).toHaveBeenCalledWith('session-1');
    });
  });
});
