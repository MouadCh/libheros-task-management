import { HttpStatus, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AUTH_INVALID_CREDENTIALS_MESSAGE } from '../src/auth/constants/auth.constants';
import { REFRESH_TOKEN_COOKIE } from '../src/auth/utils/auth-cookie.util';
import { ApiRoutes } from '../src/common/constants/api.constants';
import { AppConfigService } from '../src/common/config/app-config.service';
import { ErrorCodes } from '../src/common/exceptions/error-codes';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  authTestUser,
  buildBearerAuthorization,
  buildLoginPayload,
  buildRegisterPayload,
} from '../src/testing/fixtures/auth.fixture';
import { createE2eApp } from './utils/create-e2e-app';
import { getRefreshCookieValue, normalizeSetCookieHeader } from './utils/cookie.util';
import { ensureDatabaseReady, resetDatabase } from './utils/database';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const registerPayload = buildRegisterPayload();

  beforeAll(async () => {
    await ensureDatabaseReady();
    app = await createE2eApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registers a user, exposes safe profile data, and sets refresh cookie', async () => {
    const agent = request.agent(app.getHttpServer());

    const response = await agent
      .post(ApiRoutes.auth.register())
      .send(registerPayload)
      .expect(HttpStatus.CREATED);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      firstName: authTestUser.firstName,
      lastName: authTestUser.lastName,
      email: authTestUser.normalizedEmail,
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(getRefreshCookieValue(response.headers['set-cookie'])).toBeDefined();
  });

  it('rejects duplicate registration with conflict', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent.post(ApiRoutes.auth.register()).send(registerPayload).expect(HttpStatus.CREATED);

    const duplicate = await agent
      .post(ApiRoutes.auth.register())
      .send(registerPayload)
      .expect(HttpStatus.CONFLICT);

    expect(duplicate.body.code).toBe(ErrorCodes.RESOURCE_CONFLICT);
  });

  it('logs in with valid credentials and rejects invalid credentials generically', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent.post(ApiRoutes.auth.register()).send(registerPayload).expect(HttpStatus.CREATED);

    const loginResponse = await agent
      .post(ApiRoutes.auth.login())
      .send(buildLoginPayload())
      .expect(HttpStatus.CREATED);

    expect(loginResponse.body.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.user.email).toBe(authTestUser.normalizedEmail);

    const invalidPassword = await agent
      .post(ApiRoutes.auth.login())
      .send(buildLoginPayload(authTestUser.rawEmail, authTestUser.wrongPassword))
      .expect(HttpStatus.UNAUTHORIZED);

    expect(invalidPassword.body.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
    expect(invalidPassword.body.message).toBe(AUTH_INVALID_CREDENTIALS_MESSAGE);

    const invalidEmail = await agent
      .post(ApiRoutes.auth.login())
      .send(buildLoginPayload(authTestUser.missingEmail, authTestUser.password))
      .expect(HttpStatus.UNAUTHORIZED);

    expect(invalidEmail.body.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
    expect(invalidEmail.body.message).toBe(AUTH_INVALID_CREDENTIALS_MESSAGE);
  });

  it('returns the authenticated profile and rejects missing bearer token', async () => {
    const agent = request.agent(app.getHttpServer());

    const registerResponse = await agent
      .post(ApiRoutes.auth.register())
      .send(registerPayload)
      .expect(HttpStatus.CREATED);

    const meResponse = await agent
      .get(ApiRoutes.auth.me())
      .set(buildBearerAuthorization(registerResponse.body.accessToken as string))
      .expect(HttpStatus.OK);

    expect(meResponse.body.email).toBe(authTestUser.normalizedEmail);

    const unauthorized = await request(app.getHttpServer())
      .get(ApiRoutes.auth.me())
      .expect(HttpStatus.UNAUTHORIZED);

    expect(unauthorized.body.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
  });

  it('refreshes access token using httpOnly cookie and rotates refresh cookie', async () => {
    const agent = request.agent(app.getHttpServer());

    const registerResponse = await agent
      .post(ApiRoutes.auth.register())
      .send(registerPayload)
      .expect(HttpStatus.CREATED);
    const refreshCookieBefore = getRefreshCookieValue(registerResponse.headers['set-cookie']);
    expect(refreshCookieBefore).toBeDefined();

    const refreshResponse = await agent.post(ApiRoutes.auth.refresh()).expect(HttpStatus.CREATED);
    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));

    const refreshCookieAfter = getRefreshCookieValue(refreshResponse.headers['set-cookie']);
    expect(refreshCookieAfter).toBeDefined();
    expect(refreshCookieAfter).not.toBe(refreshCookieBefore);
  });

  it('rejects refresh-token reuse after rotation and revokes the session', async () => {
    const agent = request.agent(app.getHttpServer());

    const registerResponse = await agent
      .post(ApiRoutes.auth.register())
      .send(registerPayload)
      .expect(HttpStatus.CREATED);
    const previousRefresh = getRefreshCookieValue(registerResponse.headers['set-cookie']);
    expect(previousRefresh).toBeDefined();

    const refreshResponse = await agent.post(ApiRoutes.auth.refresh()).expect(HttpStatus.CREATED);
    const rotatedRefresh = getRefreshCookieValue(refreshResponse.headers['set-cookie']);
    expect(rotatedRefresh).toBeDefined();
    expect(rotatedRefresh).not.toBe(previousRefresh);

    const reuseResponse = await request(app.getHttpServer())
      .post(ApiRoutes.auth.refresh())
      .set('Cookie', `${REFRESH_TOKEN_COOKIE}=${previousRefresh}`)
      .expect(HttpStatus.UNAUTHORIZED);

    expect(reuseResponse.body.code).toBe(ErrorCodes.AUTH_INVALID_TOKEN);

    // Reuse detection revokes the session — the rotated cookie must also stop working.
    const afterReuse = await request(app.getHttpServer())
      .post(ApiRoutes.auth.refresh())
      .set('Cookie', `${REFRESH_TOKEN_COOKIE}=${rotatedRefresh}`)
      .expect(HttpStatus.UNAUTHORIZED);

    expect(afterReuse.body.code).toBe(ErrorCodes.AUTH_INVALID_TOKEN);
  });

  it('returns AUTH_ACCESS_TOKEN_EXPIRED for an expired access JWT', async () => {
    const agent = request.agent(app.getHttpServer());
    const jwtService = app.get(JwtService);
    const appConfig = app.get(AppConfigService);

    const registerResponse = await agent
      .post(ApiRoutes.auth.register())
      .send(registerPayload)
      .expect(HttpStatus.CREATED);

    const userId = registerResponse.body.user.id as string;
    const expiredAccessToken = await jwtService.signAsync(
      { sub: userId },
      {
        secret: appConfig.jwtAccessSecret,
        expiresIn: '-1h',
      },
    );

    const expiredResponse = await request(app.getHttpServer())
      .get(ApiRoutes.auth.me())
      .set(buildBearerAuthorization(expiredAccessToken))
      .expect(HttpStatus.UNAUTHORIZED);

    expect(expiredResponse.body.code).toBe(ErrorCodes.AUTH_ACCESS_TOKEN_EXPIRED);
    expect(expiredResponse.body.message).toBe('Access token has expired');
  });

  it('logs out, clears refresh session, and rejects subsequent refresh', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent.post(ApiRoutes.auth.register()).send(registerPayload).expect(HttpStatus.CREATED);

    const logoutResponse = await agent.post(ApiRoutes.auth.logout()).expect(HttpStatus.CREATED);
    const clearedCookie = normalizeSetCookieHeader(logoutResponse.headers['set-cookie']).find(
      (value) => value.startsWith(`${REFRESH_TOKEN_COOKIE}=`),
    );
    expect(clearedCookie).toContain('Expires=');

    const refreshAfterLogout = await agent
      .post(ApiRoutes.auth.refresh())
      .expect(HttpStatus.UNAUTHORIZED);
    expect(refreshAfterLogout.body.code).toBe(ErrorCodes.AUTH_INVALID_TOKEN);
  });
});
