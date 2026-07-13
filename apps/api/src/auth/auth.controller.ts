import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AppConfigService } from '../common/config/app-config.service';
import { AuthService } from './auth.service';
import { CurrentUser, type AuthenticatedUser } from './decorators/current-user.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  REFRESH_TOKEN_COOKIE,
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from './utils/auth-cookie.util';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly appConfig: AppConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiConflictResponse({ description: 'Email already in use' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto, this.getSessionContext(req));
    setRefreshTokenCookie(res, result.refreshToken, this.appConfig);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto, this.getSessionContext(req));
    setRefreshTokenCookie(res, result.refreshToken, this.appConfig);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  @ApiOkResponse({ description: 'New access token issued' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    const result = await this.authService.refresh(refreshToken);
    setRefreshTokenCookie(res, result.refreshToken, this.appConfig);
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Revoke refresh session and clear cookie' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    await this.authService.logout(refreshToken);
    clearRefreshTokenCookie(res, this.appConfig);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }

  private getSessionContext(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }
}
