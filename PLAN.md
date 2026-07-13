# Libheros Task Management — Implementation Plan

## Phase 0 — Audit and Scaffold

- [x] Inspect current files
- [x] Preserve useful existing work
- [x] Configure Bun workspaces
- [x] Scaffold NestJS, Nuxt and shared contracts
- [x] Configure strict TypeScript, ESLint and Prettier
- [x] CI/CD and pre-commit checks

## Phase 1 — Database and Backend Foundations

- [ ] Prisma schema and migration
- [ ] Config validation
- [ ] Global validation
- [ ] Error filter
- [ ] Swagger
- [ ] Health endpoint
- [ ] Base repository structure

## Phase 2 — Authentication

- [ ] Users repository
- [ ] Sessions repository
- [ ] Register/login
- [ ] JWT strategies
- [ ] Refresh rotation
- [ ] Logout
- [ ] Auth guard
- [ ] Unit tests

## Phase 3 — Lists and Tasks

- [ ] DTOs
- [ ] Repositories
- [ ] Services
- [ ] Controllers
- [ ] Ownership isolation
- [ ] Unit tests

## Phase 4 — WebSocket

- [ ] Authenticated gateway
- [ ] Rooms
- [ ] Typed events
- [ ] Service-to-gateway event publisher
- [ ] Cleanup
- [ ] Tests where practical

## Phase 5 — Nuxt Authentication

- [ ] Pinia auth store
- [ ] API client
- [ ] Single-flight refresh
- [ ] Middleware
- [ ] Login/register UI

## Phase 6 — Main Task Interface

- [ ] Three-column layout
- [ ] Left sidebar
- [ ] Task form and lists
- [ ] Completed section
- [ ] Right detail sidebar
- [ ] Confirmation modals
- [ ] Responsive and accessible UI

## Phase 7 — Realtime Frontend

- [ ] Socket client
- [ ] Room lifecycle
- [ ] Pinia event handlers
- [ ] Multi-tab synchronization
- [ ] Reconnection behavior

## Phase 8 — Testing

- [ ] Required unit tests
- [ ] Full e2e test
- [ ] Cross-user isolation test
- [ ] Run and fix all test commands

## Phase 9 — Delivery

- [ ] Dockerfiles
- [ ] docker-compose.yml
- [ ] .env.example
- [ ] GitHub Actions
- [ ] README
- [ ] CI badge placeholder

## Phase 10 — Final Verification

- [ ] `bun install --frozen-lockfile`
- [ ] `bun run lint`
- [ ] `bun run typecheck`
- [ ] `bun run test`
- [ ] `bun run test:e2e`
- [ ] `bun run build`
- [ ] `docker compose config`
- [ ] `docker compose up --build`
- [ ] Manual smoke verification
