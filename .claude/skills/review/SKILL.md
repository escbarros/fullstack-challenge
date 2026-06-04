---
name: review
description: "Review code changes against project architecture, conventions, and security rules. Checks DDD layer boundaries, monetary precision, race conditions, idempotency, and state machine compliance."
tools:
  - Read
  - Bash
---

# Code Review

## Purpose

Perform an architectural and convention review of staged or recent changes. Catches violations of project rules before they reach the main branch.

## Trigger

Run with: `/review` (reviews staged changes) or `/review <file-or-directory>`

## Workflow

### Step 1 — Identify Changes

If no path argument is given, run:
```bash
git diff --cached --name-only
```
If no staged changes, fall back to:
```bash
git diff --name-only HEAD~1
```
Read each changed file.

### Step 2 — Apply Checklist

For each changed file, evaluate against the relevant checks below. Only report actual violations — do not repeat rules that are correctly followed.

#### Backend (game-service / wallet-service)

**DDD Layer Boundaries**
- [ ] Domain entities do NOT import from infrastructure or presentation layers
- [ ] Use cases do NOT import HTTP/WebSocket/RabbitMQ constructs
- [ ] Controllers do NOT contain business logic — they delegate to use cases
- [ ] Repository interfaces are defined in domain, implementations in infrastructure

**Monetary Precision**
- [ ] All monetary values use `BIGINT` / integer cents, never `float` or `number` math
- [ ] Property names end with `Cents` (e.g., `amountCents`, not `amount`)
- [ ] No floating-point arithmetic on monetary values anywhere in the pipeline

**State Machine Compliance**
- [ ] Round status transitions follow: `betting → active → crashed` (no reversal)
- [ ] Bet status transitions follow the allowed paths only
- [ ] Status changes are validated before being applied

**Transaction Safety**
- [ ] Outbox inserts happen in the same `flush()` as the state change they relate to
- [ ] Critical sections (cashout) use `SELECT ... FOR UPDATE` or equivalent locking
- [ ] No `persistAndFlush()` calls inside use cases — use `flush()` at the end

**Idempotency**
- [ ] RabbitMQ consumers check idempotency key before processing
- [ ] Outbox messages include unique idempotency keys
- [ ] Wallet transactions record the idempotency key

**Auth & Security**
- [ ] Services do NOT validate JWTs (Kong's responsibility)
- [ ] Player identity comes from `X-User-Id` / `X-Username` headers only
- [ ] Wallet debit/credit is NOT exposed via REST endpoints
- [ ] No sensitive data (seeds, server secrets) leaked in betting-phase responses

**API Envelope**
- [ ] All responses use `{ data, meta, error }` format
- [ ] Error responses include `statusCode`, `type`, and `message`
- [ ] Pagination metadata uses `{ page, limit, total }` structure

#### Frontend

**State Management**
- [ ] Zustand for real-time game state, TanStack Query for async server state
- [ ] No React Context used for game state
- [ ] Socket.IO handlers write to Zustand store, not component state

**Design System**
- [ ] Colors use CSS custom properties, no hardcoded hex values
- [ ] Gold tokens used ONLY for wallet/balance contexts
- [ ] Numeric displays use `tabular-nums` and mono font
- [ ] Multiplier calculated client-side from `startedAt`, not fetched

**Security**
- [ ] API calls go through Kong base URL, never direct to services
- [ ] No secrets or seeds displayed before round crashes

### Step 3 — Report

Output findings grouped by severity:

1. **CRITICAL** — Race conditions, monetary precision errors, security issues, state machine violations
2. **WARNING** — Layer boundary violations, missing idempotency, convention deviations
3. **INFO** — Style suggestions, naming improvements, minor inconsistencies

For each finding, include: file path, line reference, what's wrong, and the specific fix.
