export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  secureCookie: process.env.SECURE_COOKIE === 'true',
  dbSync: process.env.DATABASE_SYNC === 'true',
  dbLogging: process.env.DATABASE_LOGGING === 'true',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    user: process.env.DATABASE_USER ?? 'ecommerce',
    password: process.env.DATABASE_PASSWORD ?? 'secret',
    name: process.env.DATABASE_NAME ?? 'ecommerce_db',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    expiry: process.env.JWT_EXPIRY ?? '30m',
  },

  session: {
    refreshTokenExpiryDays: parseInt(
      process.env.REFRESH_TOKEN_EXPIRY_DAYS ?? '7',
      10,
    ),
    inactivityTimeoutMinutes: parseInt(
      process.env.INACTIVITY_TIMEOUT_MINUTES ?? '30',
      10,
    ),
  },
});
