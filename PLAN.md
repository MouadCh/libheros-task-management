# Libheros Task Management — Implementation Plan

## Phase 0 — Audit and Scaffold

- [x] Inspect current files
- [x] Preserve useful existing work
- [x] Configure Bun workspaces
- [x] Scaffold NestJS, Nuxt and shared contracts
- [x] Configure strict TypeScript, ESLint and Prettier
- [x] CI/CD and pre-commit checks

## Phase 1 — Database and Backend Foundations

- [x] Prisma schema and migration
- [x] Config validation
- [x] Global validation
- [x] Error filter
- [x] Swagger
- [x] Health endpoint
- [x] Base repository structure

## Phase 2 — Authentication

- [x] Users repository
- [x] Sessions repository
- [x] Register/login
- [x] JWT strategies
- [x] Refresh rotation
- [x] Logout
- [x] Auth guard
- [x] Unit tests
- [x] Auth e2e test (register, login, refresh, logout, me)
- [x] Shared API route constants and test fixtures (no hardcoded endpoints/messages in tests)

## Phase 3 — Lists and Tasks

- [x] DTOs
- [x] Repositories
- [x] Services
- [x] Controllers
- [x] Ownership isolation
- [x] Unit tests
- [x] E2E tests

## Phase 4 — WebSocket

- [x] Authenticated gateway
- [x] Rooms
- [x] Typed events
- [x] Service-to-gateway event publisher
- [x] Cleanup
- [x] Tests where practical
- [x] E2E tests

## Phase 5 — Nuxt Authentication

- [x] Pinia auth store
- [x] API client
- [x] Single-flight refresh
- [x] Middleware
- [x] Login/register UI
- [x] Session restore error UX + auth client unit tests

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
