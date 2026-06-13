import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { ThrottlerStorage } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { RefreshToken } from '../src/refresh-tokens/entities/refresh-token.entity';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Password123!';

const extractCookies = (headers: string[]) =>
  headers.map((c) => c.split(';')[0]).join('; ');

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let refreshTokenRepo: Repository<RefreshToken>;
  let throttlerStorage: ThrottlerStorage;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    refreshTokenRepo = moduleFixture.get(getRepositoryToken(RefreshToken));
    throttlerStorage = moduleFixture.get(ThrottlerStorage);
  });

  afterAll(() => app.close());

  afterEach(async () => {
    // Reset throttle counters so each test starts with a clean slate
    (throttlerStorage as any)._storage = {};
    await refreshTokenRepo.createQueryBuilder().delete().execute();
  });

  describe('POST /auth/login', () => {
    it('returns 200 with user data and sets httpOnly cookies for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ email: ADMIN_EMAIL });

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toEqual(
        expect.arrayContaining([
          expect.stringContaining('access_token='),
          expect.stringContaining('HttpOnly'),
          expect.stringContaining('refresh_token='),
        ]),
      );
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid request body', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'pass' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /products', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app.getHttpServer()).get('/products');
      expect(res.status).toBe(401);
    });

    it('returns paginated products when authenticated', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

      const cookies = extractCookies(loginRes.headers['set-cookie'] as unknown as string[]);

      const res = await request(app.getHttpServer())
        .get('/products')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeInstanceOf(Array);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('nextCursor');
      expect(res.body).toHaveProperty('hasMore');
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 401 without a refresh token cookie', async () => {
      const res = await request(app.getHttpServer()).post('/auth/refresh');
      expect(res.status).toBe(401);
    });

    it('issues new tokens using the refresh token cookie', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

      const cookies = extractCookies(loginRes.headers['set-cookie'] as unknown as string[]);

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ email: ADMIN_EMAIL });
      const refreshCookies = res.headers['set-cookie'] as unknown as string[];
      expect(refreshCookies).toEqual(
        expect.arrayContaining([
          expect.stringContaining('access_token='),
          expect.stringContaining('refresh_token='),
        ]),
      );
    });
  });

  describe('POST /auth/logout', () => {
    it('clears auth cookies', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

      const cookies = extractCookies(loginRes.headers['set-cookie'] as unknown as string[]);

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      const clearedCookies = res.headers['set-cookie'] as unknown as string[];
      expect(clearedCookies).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^access_token=;/),
          expect.stringMatching(/^refresh_token=;/),
        ]),
      );
    });

    it('rejects further requests after logout', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

      const cookies = extractCookies(loginRes.headers['set-cookie'] as unknown as string[]);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookies);

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookies);

      expect(res.status).toBe(401);
    });
  });
});
