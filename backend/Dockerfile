FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ── Development / test (all deps + source) ───────────────────────────────────
FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

FROM builder AS dev
CMD ["npm", "run", "start:dev"]

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3001
CMD ["node", "dist/main"]
