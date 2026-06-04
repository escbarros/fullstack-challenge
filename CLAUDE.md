# Crash Game — Monorepo

## What This Is

A multiplayer real-time crash game. A multiplier rises from 1.00x and crashes at a pre-determined point. Players bet before the round and must cash out before it crashes.

## Architecture

Two independent NestJS microservices communicating asynchronously via RabbitMQ, fronted by a Kong API Gateway. Keycloak handles authentication exclusively.

```
Browser → Kong (JWT validation) → game-service | wallet-service
                                        ↕ RabbitMQ ↕
```

### Services

| Service | Port | Database | Responsibility |
|---------|------|----------|----------------|
| `game-service` | 4001 | `games` (PostgreSQL) | Round lifecycle, bets, cashout, WebSocket, provably fair |
| `wallet-service` | 4002 | `wallets` (PostgreSQL) | Player balance, debit/credit via RabbitMQ only |
| Kong | 8000 | DB-less | JWT validation, routing, header injection (`X-User-Id`, `X-Username`) |
| Keycloak | 8081 | internal | OIDC/PKCE auth, realm `crash-game` |

### Communication Patterns

- **REST** — Player-facing actions (bet, cashout, balance check) go through Kong
- **RabbitMQ** — Financial operations between services: `wallet.debit`, `wallet.credit` and their responses
- **WebSocket (Socket.IO)** — Server-to-client push only. Room: `game`. No player actions over WS
- **Outbox Pattern** — Bet insert + outbox message in same DB transaction. Poller publishes to RabbitMQ
- **Idempotency** — Wallet Service uses `betId`/`cashoutId` as idempotency keys to prevent double processing

### Round State Machine

```
BETTING → ACTIVE → CRASHED
```

### Bet State Machine

```
PENDING → CONFIRMED → CASHEDOUT | LOST
PENDING → CANCELLED (debit timeout)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS, TypeScript, MikroORM, Socket.IO |
| Frontend | TanStack Start, React, Zustand, TanStack Query, Tailwind, shadcn/ui |
| Database | PostgreSQL 16, BIGINT cents for all monetary values |
| Messaging | RabbitMQ (at-least-once delivery) |
| Auth | Keycloak (OIDC + PKCE), Kong (JWT + header injection) |
| ORM | MikroORM (Unit of Work, auto-flush transactions) |

## Monorepo Structure

```
crash-game/
├── game-service/        # NestJS — rounds, bets, WebSocket
├── wallet-service/      # NestJS — balance, transactions
├── frontend/            # TanStack Start + React
├── docker/              # kong.yml, postgres init.sql, keycloak realm
└── docker-compose.yml
```

## Global Commands

```bash
# Start everything (infra + migrations + services)
docker compose up --build

# Stop and remove volumes
docker compose down -v
```

## Critical Conventions

1. **All monetary values in integer cents** — `R$ 10.50` = `1050`. Use `BIGINT` in DB, never floats
2. **Services never validate JWT** — Kong does it. Services trust `X-User-Id` / `X-Username` headers
3. **Wallet has no REST debit/credit** — All balance mutations happen via RabbitMQ consumers
4. **Multiplier is never stored** — Calculated from `startedAt` via `e^(elapsed × growthRate)`
5. **Crash point is pre-determined** — Generated before betting phase via HMAC-SHA256 provably fair algorithm
6. **Migrations run in dedicated containers** — Service containers depend on `service_completed_successfully`
7. **Each service owns its database** — `games` and `wallets` are separate PostgreSQL databases
8. **DDD layers per module** — `domain/`, `application/`, `infrastructure/`, `presentation/`
9. **One use case per file** — e.g., `StartRoundUseCase`, `PlaceBetUseCase`
10. **Entity = ORM entity** — No separate mapping layer. Deliberate trade-off documented in spec

## Race Condition: Cashout vs Crash

Resolved via `SELECT ... FOR UPDATE` on the round row. Whichever transaction acquires the lock first wins. No ambiguity — the database is the arbiter.

## Environment Variables

See each service's `CLAUDE.md` for service-specific env vars. Global infra:

| Variable | Dev Value |
|----------|-----------|
| `KONG_DATABASE` | `off` |
| `KONG_DECLARATIVE_CONFIG` | `/kong/kong.yml` |
| `VITE_API_BASE_URL` | `http://localhost:8000` |
| `VITE_KEYCLOAK_URL` | `http://localhost:8081` |
| `VITE_KEYCLOAK_REALM` | `crash-game` |
| `VITE_KEYCLOAK_CLIENT_ID` | `crash-game-client` |
