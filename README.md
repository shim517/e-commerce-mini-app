# E-Commerce Mini-App

A full-stack e-commerce product catalog built with **Next.js**, **NestJS**, and **PostgreSQL**.

---

## Architecture Overview

### Stack
| Layer     | Tech                                          |
|-----------|-----------------------------------------------|
| Frontend  | Next.js 14 (App Router), React Query, Tailwind |
| Backend   | NestJS 10, TypeORM, Passport                  |
| Database  | PostgreSQL 16                                 |
| Auth      | JWT (httpOnly cookies) + Refresh Tokens       |

### Key Design Decisions

#### Authentication & Session Management
- **JWTs in httpOnly cookies** – tokens are never accessible to JavaScript, eliminating XSS-based token theft.
- **Two-token pattern**: a short-lived access token (30 min) paired with a long-lived refresh token (7 days, stored in the DB).
- **Inactivity timeout**: every authenticated API request updates a `lastActivityAt` timestamp on the refresh-token row. When an access token expires and the client requests a refresh, the backend rejects it if `now - lastActivityAt > 30 min`, forcing re-authentication.
- **Persistent sessions**: the refresh-token cookie is not a session cookie (it has an explicit `maxAge`), so it survives browser restarts. The session stays alive as long as the user is active within 30-minute windows and the refresh token has not expired (7 days).

#### Brute-Force Protection
- `@nestjs/throttler` applies a global IP-based rate limit on the login endpoint (10 req / 60 s).
- A per-IP `LoginAttemptsService` (in-memory; swap with Redis for production) locks an IP for 15 minutes after 5 consecutive failed login attempts.

#### Infinite Scroll & Pagination
- **Cursor-based pagination** on the backend (`WHERE id > :cursor ORDER BY id ASC`). Compared with offset pagination, this avoids the "skipped item" problem when new products are inserted and performs consistently at any depth.
- Configurable `limit` clamped to `[5, 50]`.
- Frontend uses **React Query `useInfiniteQuery`** + **Intersection Observer** to trigger next-page fetches when the bottom sentinel enters the viewport.

#### SOLID in NestJS
- **Single Responsibility**: each module (`auth`, `users`, `refresh-tokens`, `products`) owns one domain concern.
- **Open/Closed**: guards and interceptors extend behaviour (activity tracking, rate limiting) without modifying core service logic.
- **Liskov / Interface Segregation**: repository interfaces (TypeORM's `Repository<T>`) are injected through NestJS DI; services depend on abstractions.
- **Dependency Inversion**: `AuthService` depends on `UsersService` and `RefreshTokensService` interfaces, not on concrete implementations.

---

## Running Locally (Docker)

The recommended local setup uses Docker Compose. All services — Postgres, backend, and frontend — start together.

```bash
git clone <repo-url>
cd e-commerce-mini-app
docker compose up --build
```

| Service  | URL                     |
|----------|-------------------------|
| Frontend | http://localhost:3000   |
| Backend  | http://localhost:3001   |

The backend runs in **watch mode** (`nest start --watch`) so source file changes reload automatically without rebuilding the image.

---

## Running Tests

Tests run inside the same backend container via `docker compose run`. Postgres must be running first.

```bash
# Start Postgres (if not already up)
docker compose up -d postgres

# Unit tests (no DB required, but inherits the service env)
docker compose run --rm backend npm test -- --forceExit

# E2E tests (hit the real Postgres)
docker compose run --rm backend npm run test:e2e -- --forceExit
```

### Test pyramid

| Layer | Command | What it covers |
|---|---|---|
| Unit | `npm test` | `AuthService`, `ProductsService`, `LoginAttemptsService`, `AuthController` (mocked deps) |
| E2E | `npm run test:e2e` | Full login → products → refresh → logout flow against real Postgres |

---

## Database Migrations

Schema changes are managed with TypeORM migrations. `DATABASE_SYNC=true` in `docker-compose.yml` auto-applies schema on startup for local dev. In CI and production, migrations run explicitly.

```bash
# Generate a migration after changing an entity
docker compose run --rm backend npm run migration:generate src/migrations/YourChangeName

# Apply migrations manually (CI runs this automatically before tests)
docker compose run --rm backend npm run migration:run

# Roll back the last migration
docker compose run --rm backend npm run migration:revert
```

---

## Default Credentials

The backend seeds a demo user on first boot:

| Field    | Value                  |
|----------|------------------------|
| Email    | `admin@example.com`    |
| Password | `Password123!`         |

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR:
1. **Backend job** – installs deps, lints, type-checks, runs unit tests against a real Postgres service container.
2. **Frontend job** – installs deps, lints, runs `next build` to catch type and build errors.

A production pipeline would add: Docker image build & push, deployment to cloud, E2E smoke tests.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                    | Default          | Description                           |
|-----------------------------|------------------|---------------------------------------|
| `DATABASE_HOST`             | `localhost`      |                                       |
| `DATABASE_PORT`             | `5432`           |                                       |
| `DATABASE_USER`             | `ecommerce`      |                                       |
| `DATABASE_PASSWORD`         | `secret`         |                                       |
| `DATABASE_NAME`             | `ecommerce_db`   |                                       |
| `JWT_SECRET`                | –                | **Required.** Sign/verify JWTs        |
| `JWT_EXPIRY`                | `30m`            | Access token TTL                      |
| `REFRESH_TOKEN_EXPIRY_DAYS` | `7`              | Refresh token TTL                     |
| `INACTIVITY_TIMEOUT_MINUTES`| `30`             | Session inactivity window             |
| `FRONTEND_URL`              | `http://localhost:3000` | CORS allowed origin            |
| `PORT`                      | `3001`           |                                       |
| `SECURE_COOKIE`             | `false`          | Set `true` in production (HTTPS only) |
| `DATABASE_SYNC`             | `false`          | Set `true` to auto-sync schema (dev only) |
| `DATABASE_LOGGING`          | `false`          | Set `true` to log SQL queries         |

### Frontend (`frontend/.env.local`)

| Variable               | Description                           |
|------------------------|---------------------------------------|
| `NEXT_PUBLIC_API_URL`  | Public API base URL (browser-side)    |
