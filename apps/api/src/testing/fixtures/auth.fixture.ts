import type { RegisterDto } from '../../auth/dto/register.dto';

export const authTestUser = {
  firstName: 'Jean',
  lastName: 'Dupont',
  rawEmail: 'Jean.Dupont@Example.com',
  normalizedEmail: 'jean.dupont@example.com',
  password: 'SecurePass1',
  wrongPassword: 'WrongPass1',
  missingEmail: 'missing@example.com',
} as const;

export function buildRegisterPayload(overrides: Partial<RegisterDto> = {}): RegisterDto {
  return {
    firstName: authTestUser.firstName,
    lastName: authTestUser.lastName,
    email: authTestUser.rawEmail,
    emailConfirmation: authTestUser.rawEmail,
    password: authTestUser.password,
    passwordConfirmation: authTestUser.password,
    ...overrides,
  };
}

export function buildLoginPayload(
  email: string = authTestUser.rawEmail,
  password: string = authTestUser.password,
) {
  return { email, password };
}

export function buildBearerAuthorization(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}
