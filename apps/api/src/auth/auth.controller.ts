import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto, ConfirmPasswordDto, EmailDto, LoginDto, RegisterDto } from './dto.js';

type AuthRequest = Request & { user: { id: string; username: string } };

@ApiTags('authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  private readonly cookieName: string;
  private readonly secure: boolean;
  private readonly sameSite: 'lax' | 'strict' | 'none';
  private readonly allowedOrigins: Set<string>;
  constructor(@Inject(AuthService) private readonly auth: AuthService, @Inject(ConfigService) config: ConfigService) {
    this.cookieName = config.get('REFRESH_COOKIE_NAME', 'campuslink_refresh');
    this.secure = config.get('NODE_ENV') === 'production';
    const configuredSameSite = config.get<string>('REFRESH_COOKIE_SAME_SITE', this.secure ? 'none' : 'lax').toLowerCase();
    if (!['lax', 'strict', 'none'].includes(configuredSameSite)) throw new Error('REFRESH_COOKIE_SAME_SITE must be lax, strict, or none.');
    this.sameSite = configuredSameSite as 'lax' | 'strict' | 'none';
    if (this.sameSite === 'none' && !this.secure) throw new Error('REFRESH_COOKIE_SAME_SITE=none requires production secure cookies.');
    this.allowedOrigins = new Set((config.get('CORS_ORIGINS', 'http://localhost:5173') as string).split(',').map((origin) => origin.trim()));
  }
  private cookieOptions() { return { httpOnly: true, secure: this.secure, sameSite: this.sameSite, path: '/api/v1/auth', maxAge: 30 * 24 * 60 * 60 * 1000 }; }
  private assertTrustedOrigin(req: Request) {
    const origin = req.headers.origin;
    if (!origin || !this.allowedOrigins.has(origin)) throw new ForbiddenException('Request origin is not allowed.');
  }

  @Post('register') @Throttle({ default: { limit: 5, ttl: 60_000 } }) @ApiOperation({ summary: 'Register an unverified University of Kabianga student account' })
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

  @Post('login') @HttpCode(200) @Throttle({ default: { limit: 5, ttl: 60_000 } }) @ApiOperation({ summary: 'Sign in and create a refresh session' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto, req.headers['user-agent']);
    res.cookie(this.cookieName, result.refreshToken, this.cookieOptions());
    return { user: result.user, accessToken: result.accessToken, reactivated: result.reactivated };
  }

  @Post('refresh') @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60_000 } }) @ApiOperation({ summary: 'Rotate the HttpOnly refresh session' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.assertTrustedOrigin(req);
    const result = await this.auth.refresh(req.cookies?.[this.cookieName], req.headers['user-agent']);
    res.cookie(this.cookieName, result.refreshToken, this.cookieOptions());
    return { accessToken: result.accessToken };
  }

  @Post('logout') @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.assertTrustedOrigin(req);
    const result = await this.auth.logout(req.cookies?.[this.cookieName]);
    res.clearCookie(this.cookieName, { ...this.cookieOptions(), maxAge: undefined });
    return result;
  }

  @Post('forgot-password') @HttpCode(200) @Throttle({ default: { limit: 3, ttl: 60_000 } })
  forgotPassword(@Body() dto: EmailDto) { return this.auth.forgotPassword(dto.email); }

  @Post('change-password') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  async changePassword(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.changePassword(req.user.id, dto);
    res.clearCookie(this.cookieName, { ...this.cookieOptions(), maxAge: undefined });
    return result;
  }

  @Get('me') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  me(@Req() req: AuthRequest) { return this.auth.me(req.user.id); }

  @Get('sessions') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  sessions(@Req() req: AuthRequest) { return this.auth.sessions(req.user.id); }

  @Post('sessions/:id/revoke') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  revokeSession(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.auth.revokeSession(req.user.id, id); }

  @Post('deactivate') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  async deactivate(@Req() req: AuthRequest, @Body() dto: ConfirmPasswordDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.deactivate(req.user.id, dto);
    res.clearCookie(this.cookieName, { ...this.cookieOptions(), maxAge: undefined });
    return result;
  }

  @Delete('account') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  async deleteAccount(@Req() req: AuthRequest, @Body() dto: ConfirmPasswordDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.deleteAccount(req.user.id, dto);
    res.clearCookie(this.cookieName, { ...this.cookieOptions(), maxAge: undefined });
    return result;
  }
}
