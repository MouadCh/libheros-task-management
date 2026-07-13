import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../common/config/app-config.service';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import type { AccessTokenPayload } from '../utils/token-payload.util';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(appConfig: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfig.jwtAccessSecret,
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return { userId: payload.sub };
  }
}
