import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenExpiredError } from '@nestjs/jwt';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | null, user: TUser, info: Error | undefined): TUser {
    if (info instanceof TokenExpiredError) {
      throw new AppException(ErrorCodes.AUTH_ACCESS_TOKEN_EXPIRED, 'Access token has expired', 401);
    }

    if (err || !user) {
      throw new AppException(ErrorCodes.AUTH_UNAUTHORIZED, 'Unauthorized', 401);
    }

    return user;
  }
}
