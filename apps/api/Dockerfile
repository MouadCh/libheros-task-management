# syntax=docker/dockerfile:1

ARG BUN_IMAGE=oven/bun:1.2.23

FROM ${BUN_IMAGE} AS base
WORKDIR /app
ENV HUSKY=0

FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/

RUN bun install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api

RUN bun run --filter @libheros/contracts build \
  && bun run --filter @libheros/api prisma:generate \
  && bun run --filter @libheros/api build

# Production install for API + contracts only (stub web to satisfy lockfile workspace).
FROM base AS prod-deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/
RUN mkdir -p apps/web \
  && printf '%s\n' '{"name":"@libheros/web","version":"0.0.1","private":true}' > apps/web/package.json

COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

# Stubbed web package cannot satisfy the monorepo lockfile — re-resolve production deps only.
RUN rm -f bun.lock \
  && bun install --production --ignore-scripts \
  && bun run --filter @libheros/api prisma:generate

FROM base AS runtime
ENV NODE_ENV=production
ENV API_PORT=3001
ENV HOME=/home/app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --system --gid 1001 app \
  && adduser --system --uid 1001 --ingroup app --home /home/app --disabled-password app

COPY --from=prod-deps --chown=app:app /app/package.json ./
COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --from=prod-deps --chown=app:app /app/apps/api/package.json ./apps/api/
COPY --from=prod-deps --chown=app:app /app/apps/api/prisma ./apps/api/prisma
COPY --from=prod-deps --chown=app:app /app/packages/contracts ./packages/contracts
COPY --from=build --chown=app:app /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=app:app /app/apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh

RUN chmod +x /app/apps/api/docker-entrypoint.sh

WORKDIR /app/apps/api
USER app

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3001/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
