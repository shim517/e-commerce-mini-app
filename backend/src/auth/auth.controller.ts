import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';
import { AuthService, SafeUser, AuthTokens } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { LoginAttemptsService } from '../common/services/login-attempts.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginAttemptsService: LoginAttemptsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseGuards(ThrottlerGuard)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: SafeUser }> {
    const ip = (req.ip ?? req.socket.remoteAddress) as string;

    if (this.loginAttemptsService.isLocked(ip)) {
      const remaining = this.loginAttemptsService.getLockoutRemainingSeconds(ip);
      throw new HttpException(
        `Too many failed attempts. Try again in ${remaining}s.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      this.loginAttemptsService.recordFailure(ip);
      throw new UnauthorizedException('Invalid email or password.');
    }

    this.loginAttemptsService.resetAttempts(ip);
    const tokens = await this.authService.login(user);
    this.setTokenCookies(res, tokens);
    return { user: tokens.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(ThrottlerGuard)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ user: SafeUser }> {
    const rawToken: string | undefined = (req.cookies as Record<string, string>)?.refresh_token;
    if (!rawToken) throw new UnauthorizedException();
    const tokens = await this.authService.refresh(rawToken);
    this.setTokenCookies(res, tokens);
    return { user: tokens.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken: string | undefined = (req.cookies as Record<string, string>)?.refresh_token;
    await this.authService.logout(req.user.userId, rawToken);
    const base = this.baseCookieOptions();
    res.clearCookie('access_token', base);
    res.clearCookie('refresh_token', base);
    return { message: 'Logged out successfully.' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: AuthenticatedRequest) {
    return { id: req.user.userId, email: req.user.email };
  }

  private setTokenCookies(res: Response, tokens: AuthTokens): void {
    const base = this.baseCookieOptions();
    res.cookie('access_token', tokens.accessToken, { ...base, maxAge: 30 * 60 * 1000 });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...base,
      maxAge: tokens.refreshExpiryDays * 24 * 60 * 60 * 1000,
    });
  }

  private baseCookieOptions(): CookieOptions {
    return { httpOnly: true, secure: this.configService.get<boolean>('secureCookie'), sameSite: 'lax' };
  }
}
