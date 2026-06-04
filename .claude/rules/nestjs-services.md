---
paths:
  - "game-service/src/**/*.ts"
  - "wallet-service/src/**/*.ts"
---

# NestJS Service Conventions

## DDD Layer Rules

- **domain/** — Entities are MikroORM-decorated TypeScript classes with business behavior (validation methods, state transition guards). No imports from infrastructure or presentation layers.
- **application/** — One use case per file, named `<Action><Entity>UseCase` (e.g., `PlaceBetUseCase`). Use cases orchestrate entities and repositories. They must NOT import HTTP, WebSocket, or RabbitMQ constructs.
- **infrastructure/** — Repository implementations using MikroORM `EntityManager`. RabbitMQ publishers and consumers live here. This is the only layer that knows about the database and the broker.
- **presentation/** — HTTP controllers and WebSocket gateways. They receive requests, delegate to use cases, and return responses. No business logic here.

## Entity Rules

- Entities are the ORM model AND the domain model (same class, no mapping layer).
- All monetary fields use `BIGINT` stored as cents. Property names end with `Cents` (e.g., `amountCents`, `payoutCents`, `balanceCents`).
- Never use `number` for monetary values — use `bigint` or ensure the column type is `BigIntType`.
- Enum fields for status use TypeScript string enums matching the DB enum values exactly.

## Transaction Safety

- Use MikroORM's `EntityManager.flush()` for transactional persistence. Do not call `persistAndFlush()` on individual entities inside use cases — accumulate changes and flush once.
- For critical sections (cashout vs crash), use `em.execute('SELECT ... FOR UPDATE')` or equivalent locking.
- Outbox inserts MUST happen in the same `flush()` as the bet/round state change.

## Error Handling

- Use NestJS `HttpException` subclasses in presentation layer only.
- Use cases throw domain-specific errors (e.g., `InsufficientBalanceError`, `RoundNotAcceptingBetsError`).
- Presentation layer catches domain errors and maps them to the API envelope format:
  ```json
  { "data": null, "meta": null, "error": { "statusCode": N, "type": "...", "message": "..." } }
  ```

## Auth Headers

- Services NEVER validate JWTs. Kong does that.
- Player identity is read from `X-User-Id` and `X-Username` headers injected by Kong.
- Use a NestJS guard that validates header presence (not token validity).
- Create a `@CurrentPlayer()` decorator that extracts these headers cleanly.

## Testing

- Unit tests for use cases mock repositories and message publishers.
- E2E tests use a real PostgreSQL test database with migrations applied.
- Never test MikroORM internals — test use case behavior through repository interfaces.
