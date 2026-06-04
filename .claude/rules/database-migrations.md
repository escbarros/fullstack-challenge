---
paths:
  - "game-service/src/**/domain/*.entity.ts"
  - "wallet-service/src/**/domain/*.entity.ts"
  - "game-service/migrations/**"
  - "wallet-service/migrations/**"
  - "docker/postgres/**"
---

# Database & Migration Conventions

## Monetary Precision

- ALL monetary columns use `BIGINT` storing values in integer cents.
- Never use `DECIMAL`, `FLOAT`, or `REAL` for money. Integer arithmetic eliminates rounding errors.
- Column names for monetary fields must end with `_cents` (snake_case in DB) / `Cents` (camelCase in entity).
- The `crashPoint` and `cashoutMultiplier` are NOT monetary — they use `NUMERIC(10,2)`.

## Migration Rules

- Migration files follow the pattern: `Migration<YYYYMMDDHHMMSS>_<PascalCaseDescription>.ts`
- Migrations are **immutable after commit**. Never edit an applied migration — create a new one to fix issues.
- `migration:generate` is a manual developer action. Never run it in CI or `docker compose up`.
- `migration:up` is what runs automatically via the dedicated migration container.
- Each service has its own PostgreSQL database (`games` and `wallets`). Never cross-reference tables between them.

## Entity Definitions

- Use MikroORM decorators (`@Entity`, `@Property`, `@Enum`, `@ManyToOne`, etc.) directly on domain classes.
- Primary keys are UUIDs using `@PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })`.
- Timestamps: `createdAt` defaults to `now()`, `updatedAt` uses `onUpdate: () => new Date()`.
- Unique constraints: `playerId` in wallets, `idempotencyKey` in wallet_transactions and outbox.

## Schema Conventions

- Table names are lowercase plural (e.g., `rounds`, `bets`, `wallets`, `wallet_transactions`, `outbox`).
- Foreign keys use `_id` suffix in the database (e.g., `round_id`, `wallet_id`).
- Indexes: `player_id` on `bets` table must be indexed for query performance.
- Enum columns store string values, not integers. Use `@Enum({ items: () => StatusEnum })`.

## Two-Database Architecture

- `games` database: `rounds`, `bets`, `outbox` tables (owned by game-service)
- `wallets` database: `wallets`, `wallet_transactions` tables (owned by wallet-service)
- The `init.sql` in `docker/postgres/` creates both databases on first run only.
- Never create cross-database foreign keys or joins.
