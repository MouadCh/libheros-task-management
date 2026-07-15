import type { LoginPayload, RegisterPayload } from '@libheros/contracts';
import {
  AUTH_CLIENT_VALIDATION_MESSAGES,
  AUTH_FIELD_LIMITS,
  AUTH_PASSWORD_PATTERN,
} from '../constants/auth.constants';

export type AuthFieldErrors = Partial<Record<string, string>>;

export function validateLoginPayload(payload: LoginPayload): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  if (!payload.email.trim()) {
    errors.email = AUTH_CLIENT_VALIDATION_MESSAGES.emailRequired;
  } else if (!isValidEmail(payload.email)) {
    errors.email = AUTH_CLIENT_VALIDATION_MESSAGES.emailInvalid;
  } else if (payload.email.trim().length > AUTH_FIELD_LIMITS.emailMaxLength) {
    errors.email = AUTH_CLIENT_VALIDATION_MESSAGES.emailTooLong;
  }

  if (!payload.password) {
    errors.password = AUTH_CLIENT_VALIDATION_MESSAGES.passwordRequired;
  } else if (payload.password.length > AUTH_FIELD_LIMITS.passwordMaxLength) {
    errors.password = AUTH_CLIENT_VALIDATION_MESSAGES.passwordTooLong;
  }

  return errors;
}

export function validateRegisterPayload(payload: RegisterPayload): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  if (!payload.firstName.trim()) {
    errors.firstName = AUTH_CLIENT_VALIDATION_MESSAGES.firstNameRequired;
  } else if (payload.firstName.trim().length > AUTH_FIELD_LIMITS.firstNameMaxLength) {
    errors.firstName = AUTH_CLIENT_VALIDATION_MESSAGES.firstNameTooLong;
  }

  if (!payload.lastName.trim()) {
    errors.lastName = AUTH_CLIENT_VALIDATION_MESSAGES.lastNameRequired;
  } else if (payload.lastName.trim().length > AUTH_FIELD_LIMITS.lastNameMaxLength) {
    errors.lastName = AUTH_CLIENT_VALIDATION_MESSAGES.lastNameTooLong;
  }

  if (!payload.email.trim()) {
    errors.email = AUTH_CLIENT_VALIDATION_MESSAGES.emailRequired;
  } else if (!isValidEmail(payload.email)) {
    errors.email = AUTH_CLIENT_VALIDATION_MESSAGES.emailInvalid;
  } else if (payload.email.trim().length > AUTH_FIELD_LIMITS.emailMaxLength) {
    errors.email = AUTH_CLIENT_VALIDATION_MESSAGES.emailTooLong;
  }

  if (payload.emailConfirmation !== payload.email) {
    errors.emailConfirmation = AUTH_CLIENT_VALIDATION_MESSAGES.emailConfirmationMismatch;
  }

  if (!payload.password) {
    errors.password = AUTH_CLIENT_VALIDATION_MESSAGES.passwordRequired;
  } else if (payload.password.length < AUTH_FIELD_LIMITS.passwordMinLength) {
    errors.password = AUTH_CLIENT_VALIDATION_MESSAGES.passwordTooShort;
  } else if (payload.password.length > AUTH_FIELD_LIMITS.passwordMaxLength) {
    errors.password = AUTH_CLIENT_VALIDATION_MESSAGES.passwordTooLong;
  } else if (!AUTH_PASSWORD_PATTERN.test(payload.password)) {
    errors.password = AUTH_CLIENT_VALIDATION_MESSAGES.passwordComplexity;
  }

  if (payload.passwordConfirmation !== payload.password) {
    errors.passwordConfirmation = AUTH_CLIENT_VALIDATION_MESSAGES.passwordConfirmationMismatch;
  }

  return errors;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
