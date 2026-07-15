# syntax=docker/dockerfile:1

ARG BUN_IMAGE=oven/bun:1.2.23

FROM ${BUN_IMAGE} AS base
WORKDIR /app
ENV HUSKY=0

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/

RUN bun install --frozen-lockfile --ignore-scripts

FROM deps AS build
ARG NUXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
ARG NUXT_PUBLIC_WS_URL=http://localhost:3001
ENV NUXT_PUBLIC_API_BASE_URL=$NUXT_PUBLIC_API_BASE_URL
ENV NUXT_PUBLIC_WS_URL=$NUXT_PUBLIC_WS_URL

COPY tsconfig.base.json ./
COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web

RUN bun run --filter @libheros/contracts build \
  && cd apps/web \
  && bunx nuxi prepare \
  && bun run build

FROM base AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV HOME=/home/app

RUN addgroup --system --gid 1001 app \
  && adduser --system --uid 1001 --ingroup app --home /home/app --disabled-password app

COPY --from=build --chown=app:app /app/apps/web/.output ./apps/web/.output
COPY --from=build --chown=app:app /app/apps/web/package.json ./apps/web/

WORKDIR /app/apps/web
USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", ".output/server/index.mjs"]
