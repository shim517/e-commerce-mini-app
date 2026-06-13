import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { RefreshTokensService } from '../refresh-tokens/refresh-tokens.service';
import { User } from '../users/entities/user.entity';

export interface SafeUser {
  id: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiryDays: number;
  user: SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly refreshTokensService: RefreshTokensService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const valid = await this.usersService.validatePassword(
      password,
      user.passwordHash,
    );
    return valid ? user : null;
  }

  async login(user: User): Promise<AuthTokens> {
    const refreshToken = randomBytes(64).toString('hex');
    const refreshExpiryDays = this.configService.get<number>(
      'session.refreshTokenExpiryDays',
    )!;

    await this.refreshTokensService.create(
      user.id,
      refreshToken,
      refreshExpiryDays,
    );
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      refreshToken,
      refreshExpiryDays,
      user: { id: user.id, email: user.email },
    };
  }

  async refresh(rawToken: string): Promise<AuthTokens> {
    const tokenHash = this.refreshTokensService.hash(rawToken);
    const token = await this.refreshTokensService.findByTokenHash(tokenHash);

    if (!token || token.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const timeoutMs =
      this.configService.get<number>('session.inactivityTimeoutMinutes')! *
      60 *
      1000;
    if (Date.now() - token.lastActivityAt.getTime() > timeoutMs) {
      await this.refreshTokensService.deleteById(token.id);
      throw new UnauthorizedException('Session expired due to inactivity.');
    }

    const user = await this.usersService.findById(token.userId);
    if (!user) throw new UnauthorizedException();

    await this.refreshTokensService.updateLastActivity(token.id);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });
    const refreshExpiryDays = this.configService.get<number>(
      'session.refreshTokenExpiryDays',
    )!;

    return {
      accessToken,
      refreshToken: rawToken,
      refreshExpiryDays,
      user: { id: user.id, email: user.email },
    };
  }

  async logout(userId: string, rawToken: string | undefined): Promise<void> {
    if (rawToken) {
      const tokenHash = this.refreshTokensService.hash(rawToken);
      await this.refreshTokensService.deleteByTokenHash(tokenHash);
    } else {
      await this.refreshTokensService.deleteAllForUser(userId);
    }
  }
}
