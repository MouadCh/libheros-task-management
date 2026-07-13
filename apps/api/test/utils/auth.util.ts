import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { RegisterDto } from '../../src/auth/dto/register.dto';
import { ApiRoutes } from '../../src/common/constants/api.constants';

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
