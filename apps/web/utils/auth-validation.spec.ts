import { describe, expect, it } from 'bun:test';
import { AUTH_FIELD_LIMITS } from '../constants/auth.constants';
import { validateLoginPayload, validateRegisterPayload } from './auth-validation';

describe('auth validation', () => {
  it('rejects oversized register fields', () => {
    const errors = validateRegisterPayload({
      firstName: 'a'.repeat(AUTH_FIELD_LIMITS.firstNameMaxLength + 1),
      lastName: 'Dupont',
      email: `${'a'.repeat(AUTH_FIELD_LIMITS.emailMaxLength)}@example.com`,
      emailConfirmation: `${'a'.repeat(AUTH_FIELD_LIMITS.emailMaxLength)}@example.com`,
      password: `${'a'.repeat(AUTH_FIELD_LIMITS.passwordMaxLength + 1)}1`,
      passwordConfirmation: `${'a'.repeat(AUTH_FIELD_LIMITS.passwordMaxLength + 1)}1`,
    });

    expect(errors.firstName).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });

  it('accepts a valid login payload', () => {
    expect(
      validateLoginPayload({
        email: 'jean.dupont@example.com',
        password: 'SecurePass1',
      }),
    ).toEqual({});
  });
});
