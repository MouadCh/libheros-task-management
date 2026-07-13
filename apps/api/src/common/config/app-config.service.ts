import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from './app-config.types';
import { APP_CONFIG_KEY } from './app.config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  private get config(): AppConfig {
    return this.configService.getOrThrow<AppConfig>(APP_CONFIG_KEY);
  }

  get nodeEnv(): string {
    return this.config.nodeEnv;
  }

  get host(): string {
    return this.config.host;
  }

  get apiPort(): number {
    return this.config.apiPort;
  }

  get webPort(): number {
    return this.config.webPort;
  }

  get frontendOrigin(): string {
    return this.config.frontendOrigin;
  }

  get corsOrigins(): readonly string[] {
    return this.config.corsOrigins;
  }

  get databaseUrl(): string {
    return this.config.databaseUrl;
  }

  get jwtAccessSecret(): string {
    return this.config.jwtAccessSecret;
  }

  get jwtAccessExpiresIn(): string {
    return this.config.jwtAccessExpiresIn;
  }

  get jwtRefreshSecret(): string {
    return this.config.jwtRefreshSecret;
  }

  get jwtRefreshExpiresIn(): string {
    return this.config.jwtRefreshExpiresIn;
  }

  get cookieSecure(): boolean {
    return this.config.cookieSecure;
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  isCorsOriginAllowed(origin: string | undefined): boolean {
    if (!origin) {
      return true;
    }

    return this.corsOrigins.includes(origin);
  }
}
