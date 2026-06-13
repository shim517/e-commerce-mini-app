import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshTokensService } from '../refresh-tokens/refresh-tokens.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../refresh-tokens/entities/refresh-token.entity';

const MOCK_USER: User = {
  id: 'user-uuid',
  email: 'test@example.com',
  passwordHash: 'hashed',
  createdAt: new Date(),
  updatedAt: new Date(),
  refreshTokens: [],
};

const makeToken = (overrides: Partial<RefreshToken> = {}): RefreshToken => ({
  id: 'token-uuid',
  tokenHash: 'hash',
  userId: 'user-uuid',
  lastActivityAt: new Date(),
  expiresAt: new Date(Date.now() + 86_400_000),
  createdAt: new Date(),
  user: MOCK_USER,
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let refreshTokensService: jest.Mocked<RefreshTokensService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            validatePassword: jest.fn(),
          },
        },
        {
          provide: RefreshTokensService,
          useValue: {
            create: jest.fn(),
            hash: jest.fn(),
            findByTokenHash: jest.fn(),
            updateLastActivity: jest.fn(),
            deleteById: jest.fn(),
            deleteByTokenHash: jest.fn(),
            deleteAllForUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('jwt-token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    refreshTokensService = module.get(RefreshTokensService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  describe('validateUser', () => {
    it('returns the user when email and password are correct', async () => {
      usersService.findByEmail.mockResolvedValue(MOCK_USER);
      usersService.validatePassword.mockResolvedValue(true);

      await expect(
        service.validateUser('test@example.com', 'pass'),
      ).resolves.toBe(MOCK_USER);
    });

    it('returns null when the password is wrong', async () => {
      usersService.findByEmail.mockResolvedValue(MOCK_USER);
      usersService.validatePassword.mockResolvedValue(false);

      await expect(
        service.validateUser('test@example.com', 'wrong'),
      ).resolves.toBeNull();
    });

    it('returns null when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('nobody@example.com', 'pass'),
      ).resolves.toBeNull();
    });
  });

  describe('login', () => {
    it('creates a refresh token and returns tokens with a safe user', async () => {
      configService.get.mockReturnValue(7);
      refreshTokensService.create.mockResolvedValue(makeToken());

      const result = await service.login(MOCK_USER);

      expect(refreshTokensService.create).toHaveBeenCalledWith(
        'user-uuid',
        expect.any(String),
        7,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-uuid',
        email: 'test@example.com',
      });
      expect(result).toMatchObject({
        accessToken: 'jwt-token',
        refreshExpiryDays: 7,
        user: { id: 'user-uuid', email: 'test@example.com' },
      });
      expect(typeof result.refreshToken).toBe('string');
    });
  });

  describe('refresh', () => {
    it.each([
      {
        scenario: 'token not found in DB',
        token: null,
        message: 'Session expired. Please log in again.',
      },
      {
        scenario: 'token is past its expiry date',
        token: makeToken({ expiresAt: new Date(Date.now() - 1000) }),
        message: 'Session expired. Please log in again.',
      },
    ])(
      'throws UnauthorizedException when $scenario',
      async ({ token, message }) => {
        refreshTokensService.hash.mockReturnValue('hash');
        refreshTokensService.findByTokenHash.mockResolvedValue(token);
        configService.get.mockReturnValue(30);

        await expect(service.refresh('raw')).rejects.toThrow(message);
      },
    );

    it('throws UnauthorizedException and deletes the token when inactivity timeout is exceeded', async () => {
      const staleToken = makeToken({
        lastActivityAt: new Date(Date.now() - 31 * 60 * 1000),
      });
      refreshTokensService.hash.mockReturnValue('hash');
      refreshTokensService.findByTokenHash.mockResolvedValue(staleToken);
      configService.get.mockReturnValue(30);

      await expect(service.refresh('raw')).rejects.toThrow(
        'Session expired due to inactivity.',
      );
      expect(refreshTokensService.deleteById).toHaveBeenCalledWith(
        'token-uuid',
      );
    });

    it('rotates the refresh token and returns new tokens for a valid token', async () => {
      refreshTokensService.hash.mockReturnValue('hash');
      refreshTokensService.findByTokenHash.mockResolvedValue(makeToken());
      refreshTokensService.create.mockResolvedValue(makeToken());
      configService.get.mockImplementation((key: string) =>
        key === 'session.inactivityTimeoutMinutes' ? 30 : 7,
      );
      usersService.findById.mockResolvedValue(MOCK_USER);

      const result = await service.refresh('raw');

      expect(refreshTokensService.deleteById).toHaveBeenCalledWith('token-uuid');
      expect(refreshTokensService.create).toHaveBeenCalledWith(
        'user-uuid',
        expect.any(String),
        7,
      );
      expect(result.refreshToken).not.toBe('raw');
      expect(result).toMatchObject({
        accessToken: 'jwt-token',
        refreshExpiryDays: 7,
        user: { id: 'user-uuid', email: 'test@example.com' },
      });
    });
  });

  describe('logout', () => {
    it('deletes the specific token by hash when rawToken is provided', async () => {
      refreshTokensService.hash.mockReturnValue('token-hash');

      await service.logout('user-uuid', 'raw-token');

      expect(refreshTokensService.deleteByTokenHash).toHaveBeenCalledWith(
        'token-hash',
      );
      expect(refreshTokensService.deleteAllForUser).not.toHaveBeenCalled();
    });

    it('deletes all tokens for the user when rawToken is absent', async () => {
      await service.logout('user-uuid', undefined);

      expect(refreshTokensService.deleteAllForUser).toHaveBeenCalledWith(
        'user-uuid',
      );
      expect(refreshTokensService.deleteByTokenHash).not.toHaveBeenCalled();
    });
  });
});
