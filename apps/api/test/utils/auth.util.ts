import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { RegisterDto } from '../../src/auth/dto/register.dto';
import { ApiRoutes } from '../../src/common/constants/api.constants';
import { buildLoginPayload } from '../../src/testing/fixtures/auth.fixture';

export async function registerAndGetAccessToken(
  server: App,
  payload: RegisterDto,
): Promise<{ accessToken: string; userId: string }> {
  const response = await request(server)
    .post(ApiRoutes.auth.register())
    .send(payload)
    .expect(HttpStatus.CREATED);

  return {
    accessToken: response.body.accessToken as string,
    userId: response.body.user.id as string,
  };
}

/**
 * Registers, then logs in so e2e suites explicitly exercise the login path
 * (Phase 8 full-flow requirement) rather than using only the register token.
 */
export async function registerThenLogin(
  server: App,
  payload: RegisterDto,
): Promise<{ accessToken: string; userId: string; email: string }> {
  await request(server).post(ApiRoutes.auth.register()).send(payload).expect(HttpStatus.CREATED);

  const loginResponse = await request(server)
    .post(ApiRoutes.auth.login())
    .send(buildLoginPayload(payload.email, payload.password))
    .expect(HttpStatus.CREATED);

  expect(loginResponse.body.accessToken).toEqual(expect.any(String));
  expect(loginResponse.body.user).toMatchObject({
    id: expect.any(String),
    email: expect.any(String),
  });

  return {
    accessToken: loginResponse.body.accessToken as string,
    userId: loginResponse.body.user.id as string,
    email: loginResponse.body.user.email as string,
  };
}
