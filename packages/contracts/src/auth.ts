import type { UserDto } from './user';

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  emailConfirmation: string;
  password: string;
  passwordConfirmation: string;
}
