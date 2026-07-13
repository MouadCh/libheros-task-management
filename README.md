# Libheros Task Management

A Bun monorepo for a collaborative task management app with a NestJS API, Nuxt frontend, and shared TypeScript contracts.

## Stack

| Layer                     | Tech                                              |
| ------------------------- | ------------------------------------------------- |
| Runtime / package manager | [Bun](https://bun.sh) 1.2                         |
| API                       | [NestJS](https://nestjs.com)                      |
| Web                       | [Nuxt 3](https://nuxt.com) + Vue 3 + Tailwind CSS |
| Shared types              | `@libheros/contracts`                             |
| Lint / format             | ESLint 9 + Prettier                               |
| Tests                     | Jest (API)                                        |

## Project structure

```
apps/
  api/          NestJS REST + WebSocket API
  web/          Nuxt frontend
packages/
  contracts/    Shared DTOs, enums, and event names
```

## Prerequisites

- [Bun](https://bun.sh) `1.2.0` (see `packageManager` in `package.json`)

## Getting started

```bash
bun install
```

Run both apps:

```bash
bun run dev
```

Or run them separately:

```bash
bun run dev:api   # http://localhost:3001/api
bun run dev:web   # http://localhost:3000
```

### Default URLs

| Service    | URL                                |
| ---------- | ---------------------------------- |
| API        | `http://localhost:3001/api`        |
| API health | `http://localhost:3001/api/health` |
| Web        | `http://localhost:3000`            |

The web app reads `NUXT_PUBLIC_API_BASE_URL` and `NUXT_PUBLIC_WS_URL` from the environment (defaults point to the local API).

## Scripts

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `bun run dev`          | Start all workspaces in dev mode |
| `bun run dev:api`      | Start only the API               |
| `bun run dev:web`      | Start only the web app           |
| `bun run build`        | Build all workspaces             |
| `bun run lint`         | Lint all workspaces              |
| `bun run typecheck`    | Type-check all workspaces        |
| `bun run test`         | Run unit tests                   |
| `bun run test:e2e`     | Run API e2e tests                |
| `bun run format`       | Format with Prettier             |
| `bun run format:check` | Check formatting                 |
| `bun run ci`           | Full local CI pipeline           |

## Quality checks

**Pre-commit** — Husky runs `lint-staged` on staged files (ESLint + Prettier).

**CI** — GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main`:

`format:check` → `lint` → `typecheck` → `test` → `test:e2e` → `build`

Run the same pipeline locally:

```bash
bun run ci
```

## Status

Phase 0 (scaffold) is complete. See [PLAN.md](./PLAN.md) for the full implementation roadmap.
