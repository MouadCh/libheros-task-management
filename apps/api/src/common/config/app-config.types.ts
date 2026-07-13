export interface AppConfig {
  nodeEnv: string;
  host: string;
  apiPort: number;
  webPort: number;
  frontendOrigin: string;
  corsOrigins: string[];
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  cookieSecure: boolean;
}
