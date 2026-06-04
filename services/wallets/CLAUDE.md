# Wallet Service

NestJS microservice responsible exclusively for player balance management. No REST endpoints for debit/credit — all balance mutations happen via RabbitMQ message consumption.

## Module

Single module: `WalletModule`

## DDD Layer Structure

```
src/wallet/
├── domain/          # Wallet entity, WalletTransaction entity
├── application/     # Use cases: CreateWalletUseCase, DebitWalletUseCase, CreditWalletUseCase
├── infrastructure/  # MikroORM repositories, RabbitMQ consumers/publishers
└── presentation/    # HTTP controllers (create wallet, get balance only)
```

## Key Entities

### Wallet
- Fields: `id`, `playerId` (unique), `balanceCents` (BIGINT, default 0), `createdAt`, `updatedAt`
- One wallet per player, enforced by unique constraint

### WalletTransaction
- Fields: `id`, `walletId` (FK), `idempotencyKey` (unique), `operation`, `amountCents` (BIGINT), `balanceBeforeCents`, `balanceAfterCents`, `createdAt`
- Every debit/credit creates a transaction record for audit trail
- `idempotencyKey` prevents double processing of RabbitMQ messages

## REST Endpoints (via Kong)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/wallets` | Create wallet for authenticated player |
| `GET` | `/wallets/me` | Get balance for authenticated player |

**No debit/credit endpoints exist.** All balance changes come from RabbitMQ.

## Commands

```bash
npm run start:dev
npm run start:prod
npm run test
npm run test:e2e
npm run migration:generate -- --name <Name>
npm run migration:up
npm run migration:down
```

## Environment Variables

| Variable | Dev Value |
|----------|-----------|
| `PORT` | `4002` |
| `DATABASE_URL` | `postgresql://admin:admin@postgres:5432/wallets` |
| `RABBITMQ_URL` | `amqp://admin:admin@rabbitmq:5672` |

## RabbitMQ Events Consumed

- `wallet.debit` → Debit `amountCents` from player balance. Publish `wallet.debit.success` or `wallet.debit.failed`
- `wallet.credit` → Credit `payoutCents` to player balance. Publish `wallet.credit.success` or `wallet.credit.failed`

## RabbitMQ Events Published

- `wallet.debit.success` — Debit applied. Includes new `balanceCents`
- `wallet.debit.failed` — Insufficient balance or internal error. Includes `reason`
- `wallet.credit.success` — Credit applied. Includes new `balanceCents`
- `wallet.credit.failed` — Internal error. Game Service routes to DLQ

## Critical Implementation Notes

- **BIGINT cents everywhere** — `R$ 10.50` = `1050`. Integer arithmetic only, never floats
- **Idempotency** — Before any mutation, check if `idempotencyKey` exists in `wallet_transactions`. If yes, ACK silently
- **Audit trail** — Every operation records `balanceBeforeCents` and `balanceAfterCents` for reconciliation
- **Reconciliation** — Sum of all transactions for a player must equal current `balanceCents`
- Player identity comes from RabbitMQ message payload (`playerId`), not from HTTP headers
