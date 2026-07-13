import { HttpException, type HttpStatus } from '@nestjs/common';
import type { ErrorCode } from './error-codes';

export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
  ) {
    super({ code, message }, status);
  }
}
