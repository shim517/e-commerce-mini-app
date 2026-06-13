import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService, AuthTokens } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginAttemptsService } from '../common/services/login-attempts.service';

const MOCK_TOKENS: AuthTokens = {
  accessToken: 'access-jwt',
  refreshToken: 'raw-refresh-token',
  refreshExpiryDays: 7,
  user: { id: 'user-id', email: 'test@example.com' },
};

class MockJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = { userId: 'user-id', email: 'test@example.com' };
    return true;
  }
}

describe('AuthController', () => {
  let app: INestApplication;
  let authService: jest.Mocked<AuthService>;
  let loginAttemptsService: jest.Mocked<LoginAttemptsService>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
          },
        },
        {
          provide: LoginAttemptsService,
          useValue: {
            isLocked: jest.fn().mockReturnValue(false),
            recordFailure: jest.fn(),
            resetAttempts: jest.fn(),
            getLockoutRemainingSeconds: jest.fn().mockReturnValue(0),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(false) },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtGuard)
      .compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    authService = module.get(AuthService);
    loginAttemptsService = module.get(LoginAttemptsService);
  });

  afterAll(() => app.close());

  beforeEach(() => jest.clearAllMocks());

  describe('POST /auth/login', () => {
    it('returns 200 with user and sets httpOnly cookies on success', async () => {
      authService.validateUser.mockResolvedValue({ id: 'user-id' } as any);
      authService.login.mockResolvedValue(MOCK_TOKENS);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ user: { id: 'user-id', email: 'test@example.com' } });
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toEqual(
        expect.arrayContaining([
          expect.stringContaining('access_token='),
          expect.stringContaining('refresh_token='),
        ]),
      );
    });

    it('returns 401 and records failure when credentials are invalid', async () => {
      authService.validateUser.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(loginAttemptsService.recordFailure).toHaveBeenCalled();
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('returns 429 when the IP is locked out', async () => {
      loginAttemptsService.isLocked.mockReturnValue(true);
      loginAttemptsService.getLockoutRemainingSeconds.mockReturnValue(300);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });

      expect(res.status).toBe(429);
      expect(authService.validateUser).not.toHaveBeenCalled();
    });

    it.each([
      { body: {}, label: 'empty body' },
      { body: { email: 'not-an-email', password: 'Password1' }, label: 'invalid email format' },
      { body: { email: 'test@example.com', password: '123' }, label: 'password too short' },
      { body: { email: 'test@example.com' }, label: 'missing password' },
    ])('returns 400 for $label', async ({ body }) => {
      const res = await request(app.getHttpServer()).post('/auth/login').send(body);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 401 when no refresh_token cookie is present', async () => {
      const res = await request(app.getHttpServer()).post('/auth/refresh');
      expect(res.status).toBe(401);
    });

    it('returns 200 and sets new cookies on success', async () => {
      authService.refresh.mockResolvedValue(MOCK_TOKENS);

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=valid-raw-token');

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toEqual(
        expect.arrayContaining([
          expect.stringContaining('access_token='),
          expect.stringContaining('refresh_token='),
        ]),
      );
    });
  });

  describe('POST /auth/logout', () => {
    it('returns 200 and clears both auth cookies', async () => {
      authService.logout.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', 'access_token=a; refresh_token=r');

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^access_token=;/),
          expect.stringMatching(/^refresh_token=;/),
        ]),
      );
    });
  });

  describe('GET /auth/me', () => {
    it('returns the authenticated user from the JWT payload', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'user-id', email: 'test@example.com' });
    });
  });
});
