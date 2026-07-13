import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode, ErrorCodes } from '../exceptions/error-codes';

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
  path: string;
  requestId: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    let code: ErrorCode = ErrorCodes.INTERNAL_ERROR;
    let message = 'Internal server error';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exceptionResponse && typeof exceptionResponse === 'object') {
      const body = exceptionResponse as Record<string, unknown>;
      if (typeof body.code === 'string') {
        code = body.code as ErrorCode;
      }
      if (typeof body.message === 'string') {
        message = body.message;
      } else if (Array.isArray(body.message)) {
        code = ErrorCodes.VALIDATION_ERROR;
        message = body.message.join(', ');
      }
    }

    if (statusCode === Number(HttpStatus.UNAUTHORIZED) && code === ErrorCodes.INTERNAL_ERROR) {
      code = ErrorCodes.AUTH_UNAUTHORIZED;
      message = 'Unauthorized';
    }

    if (statusCode >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      statusCode,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.requestId ?? 'unknown',
    };

    response.status(statusCode).json(body);
  }
}
