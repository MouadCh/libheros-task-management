import type { ErrorCode } from '@libheros/contracts';

export const AUTH_UI_MODE = {
  login: 'login',
  register: 'register',
} as const;

export type AuthUiMode = (typeof AUTH_UI_MODE)[keyof typeof AUTH_UI_MODE];

export const AUTH_CLIENT_VALIDATION_MESSAGES = {
  firstNameRequired: 'First name is required.',
  lastNameRequired: 'Last name is required.',
  firstNameTooLong: 'First name must be at most 100 characters.',
  lastNameTooLong: 'Last name must be at most 100 characters.',
  emailRequired: 'Email is required.',
  emailInvalid: 'Enter a valid email address.',
  emailTooLong: 'Email must be at most 255 characters.',
  emailConfirmationMismatch: 'Email confirmation must match email.',
  passwordRequired: 'Password is required.',
  passwordTooShort: 'Password must be at least 8 characters.',
  passwordTooLong: 'Password must be at most 128 characters.',
  passwordComplexity: 'Password must contain at least one letter and one number.',
  passwordConfirmationMismatch: 'Password confirmation must match password.',
} as const;

/** Mirrors Nest RegisterDto / LoginDto constraints. */
export const AUTH_FIELD_LIMITS = {
  firstNameMaxLength: 100,
  lastNameMaxLength: 100,
  emailMaxLength: 255,
  passwordMinLength: 8,
  passwordMaxLength: 128,
} as const;

export const AUTH_PASSWORD_MIN_LENGTH = AUTH_FIELD_LIMITS.passwordMinLength;
export const AUTH_PASSWORD_MAX_LENGTH = AUTH_FIELD_LIMITS.passwordMaxLength;
export const AUTH_PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export const AUTH_REQUEST_TIMEOUT_MS = 10_000;

export const AUTH_ACCESS_TOKEN_EXPIRED_CODE = 'AUTH_ACCESS_TOKEN_EXPIRED' satisfies ErrorCode;

export const AUTH_UNAUTHORIZED_CODE = 'AUTH_UNAUTHORIZED' satisfies ErrorCode;
export const AUTH_INVALID_TOKEN_CODE = 'AUTH_INVALID_TOKEN' satisfies ErrorCode;

export const AUTH_SESSION_ERROR_QUERY = 'sessionError';
export const AUTH_SESSION_ERROR_QUERY_VALUE = '1';

export const AUTH_SESSION_ERROR_MESSAGE =
  'Unable to restore your session. Check your connection and try again.';
