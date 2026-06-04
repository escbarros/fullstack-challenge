# Game Service

NestJS microservice managing the full round lifecycle: betting phase, active phase, crash, and bet settlement.

## Modules

| Module | Responsibility |
|--------|---------------|
| `RoundModule` | Round creation, state transitions, crash point generation, provably fair |
| `BetModule` | Bet placement, cashout, settlement, outbox publishing |

## DDD Layer Structure (per module)

```
src/<module>/
├── domain/          # Entities with behavior (MikroORM-decorated classes)
├── application/     # Use cases, one per file (e.g., StartRoundUseCase)
├── infrastructure/  # MikroORM repositories, RabbitMQ publishers/consumers
└── presentation/    # HTTP controllers, WebSocket gateway
```

## Key Entities

### Round
- Fields: `id`, `status` (enum: betting|active|crashed), `crashPoint` (NUMERIC 10,2), `seedHash`, `serverSeed`, `clientSeed`, `bettingEndsAt`, `startedAt`, `crashedAt`
- Status transitions: `betting → active → crashed` (one-way, never reversed)

### Bet
- Fields: `id`, `roundId`, `playerId`, `amountCents` (BIGINT), `status` (enum: pending|confirmed|cashedout|lost|cancelled), `cashoutMultiplier` (NUMERIC 10,2), `payoutCents` (BIGINT)
- Status transitions: `pending → confirmed → cashedout|lost` or `pending → cancelled`

### Outbox
- Fields: `id`, `eventType`, `payload` (JSONB), `status` (pending|sent|failed), `idempotencyKey` (unique), `retryCount`
- Bet insert and outbox insert happen in the **same transaction**

## Commands

```bash
npm run start:dev          # Dev with hot reload
npm run start:prod         # Production
npm run test               # Unit tests
npm run test:e2e           # E2E tests
npm run migration:generate -- --name <Name>  # Generate migration from entity diff
npm run migration:up       # Apply pending migrations
npm run migration:down     # Revert last migration
npm run migration:status   # List migration state
```

## Environment Variables

| Variable | Dev Value |
|----------|-----------|
| `PORT` | `4001` |
| `DATABASE_URL` | `postgresql://admin:admin@postgres:5432/games` |
| `RABBITMQ_URL` | `amqp://admin:admin@rabbitmq:5672` |

## WebSocket Events (Server → Client)

| Event | Trigger | Key Data |
|-------|---------|----------|
| `round:betting` | New round created | `roundId`, `seedHash`, `bettingEndsAt` |
| `round:bet` | Bet confirmed by Wallet Service | `playerId`, `username`, `amountCents` |
| `round:started` | Betting phase ends | `roundId`, `startedAt` |
| `round:tick` | Every ~1s during active phase | `elapsedMs` (clock drift correction) |
| `round:cashout` | Player cashes out | `playerId`, `cashoutMultiplier`, `payoutCents` |
| `round:crashed` | Multiplier hits crash point | `crashPoint`, `serverSeed`, `clientSeed` |
| `bet:cancelled` | Debit timeout (private, single player) | `betId`, `reason` |

## RabbitMQ Events Published

- `wallet.debit` — On bet creation (pending). Payload: `betId`, `playerId`, `amountCents`
- `wallet.credit` — On successful cashout. Payload: `betId`, `playerId`, `payoutCents`

## RabbitMQ Events Consumed

- `wallet.debit.success` → Update bet to `confirmed`, emit `round:bet` via WS
- `wallet.debit.failed` → Update bet to `cancelled`, emit `bet:cancelled` via WS
- `wallet.credit.success` → Audit/logging only
- `wallet.credit.failed` → Route to dead letter queue

## Critical Implementation Notes

- Cashout uses `SELECT round FOR UPDATE` to prevent race condition with crash
- Crash point formula: `max(1, (2^32 / (parseInt(hmac[0:8], 16) + 1)) × 0.99)`
- Outbox poller retries failed messages — guarantees at-least-once delivery
- Pending bets have a configurable timeout; cancelled if debit not confirmed in time
- On service restart during ACTIVE: detect orphaned rounds and force crash with pre-saved crashPoint
