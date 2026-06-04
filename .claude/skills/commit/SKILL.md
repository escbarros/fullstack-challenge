---
name: commit
description: "Analyze staged changes and generate a commitizen-compliant semantic commit message. Follows Conventional Commits: type(scope): subject with optional body and breaking change footer."
tools:
  - Bash
  - Read
---

# Generate Semantic Commit Message

## Purpose

Inspect staged changes and produce a commitizen-compliant commit message. Never guesses — always reads the actual diff before writing anything.

## Trigger

Run with: `/commit`

## Conventional Commits Reference

```
<type>(<scope>): <subject>

[optional body]

[optional footer — BREAKING CHANGE or issue refs]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature visible to the user or consumer |
| `fix` | Bug fix |
| `refactor` | Code restructure with no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests only |
| `docs` | Documentation only (comments, markdown, specs) |
| `style` | Formatting, whitespace — no logic change |
| `build` | Build system, dependencies, docker, migrations |
| `ci` | CI/CD pipeline changes |
| `chore` | Maintenance with no production impact |
| `revert` | Reverts a previous commit |

### Scope

The scope is the part of the codebase affected. Use the values below — pick the most specific one that fits. If multiple scopes are equally affected, use the dominant one or omit scope.

| Scope | Covers |
|-------|--------|
| `round` | Round entity, round state machine, RoundModule |
| `bet` | Bet entity, placement, settlement, BetModule |
| `cashout` | Cashout flow, race condition logic |
| `wallet` | Wallet entity, balance, WalletModule |
| `outbox` | Outbox pattern, poller, at-least-once delivery |
| `rabbitmq` | RabbitMQ publishers, consumers, message schemas |
| `websocket` | Socket.IO gateway, event emission |
| `auth` | Kong JWT config, Keycloak, guards, header injection |
| `provably-fair` | HMAC crash point algorithm, seed generation |
| `migrations` | Database migrations, schema changes |
| `frontend` | Frontend-wide changes not fitting a narrower scope |
| `multiplier` | Client-side multiplier calculation, animation |
| `design-system` | Jungle tokens, globals.css, @theme, .jg-* classes |
| `ui` | Individual component changes (shadcn, custom) |
| `store` | Zustand store, real-time game state |
| `query` | TanStack Query hooks, cache, fetchers |
| `docker` | docker-compose, Dockerfile, container config |
| `kong` | kong.yml, gateway routing, plugins |
| `deps` | Dependency updates (package.json, lock files) |

### Subject Rules

- Imperative mood: "add", "fix", "remove" — not "added", "fixes", "removing"
- Lowercase first letter
- No period at the end
- Max 72 characters for the full first line (`type(scope): subject`)
- Describe *what* the change does, not *how*

### Body Rules (include when useful)

- Separate from subject with a blank line
- Explain *why* the change was made, not what — the diff shows the what
- Wrap at 100 characters per line
- Use bullet points for multi-part explanations

### Breaking Changes

If the change breaks an existing API contract, WebSocket event shape, RabbitMQ message schema, or database column:

```
BREAKING CHANGE: <description of what broke and how to migrate>
```

This goes in the footer, after a blank line following the body.

---

## Workflow

### Step 1 — Read Staged Changes

```bash
git diff --cached
```

If output is empty, fall back to:

```bash
git diff HEAD~1
```

If still empty, inform the user there is nothing to commit and stop.

Also run:

```bash
git diff --cached --stat
```

To get a summary of which files changed.

### Step 2 — Analyze the Diff

Identify:
- Which service(s) are affected: `game-service`, `wallet-service`, `frontend`, `docker`, root config
- Which domain areas changed: entities, use cases, controllers, consumers, migrations, components, styles
- Whether any public interfaces changed: REST endpoints, WS events, RabbitMQ schemas, DB columns
- Whether the change is additive (feat), corrective (fix), structural (refactor), or administrative (chore/build/ci)

### Step 3 — Select Type and Scope

Apply this decision tree:

1. Does the diff add a new capability a user or API consumer can observe? → `feat`
2. Does it correct incorrect behavior? → `fix`
3. Does it restructure code without changing behavior? → `refactor`
4. Does it only touch test files? → `test`
5. Does it only touch markdown, specs, or comments? → `docs`
6. Does it only touch migrations, Dockerfile, docker-compose, deps? → `build`
7. Does it only touch CI config? → `ci`
8. Does it only touch formatting/whitespace? → `style`
9. Anything else with no production impact → `chore`

Then pick the scope from the table above. If the change spans two scopes at the same level of importance, prefer the one closer to the user (e.g. `cashout` over `rabbitmq` if both are touched as part of a cashout feature).

### Step 4 — Generate Commit Message

Produce the message in this format:

```
type(scope): subject line

Why this change was needed and any non-obvious context. Keep it
short — one to three sentences is usually enough. Omit if the
subject line is self-explanatory.

BREAKING CHANGE: description (only if applicable)

Closes #123 (only if applicable)
```

### Step 5 — Present and Confirm

Show the generated message to the user clearly. Then ask:

> Run `git commit` with this message?

Wait for explicit confirmation before executing. If confirmed, run:

```bash
git commit -m "<subject line>" -m "<body>" -m "<footer>"
```

If the user wants to edit first, show them the message as plain text so they can copy and modify it.

---

## Examples

### Simple feature
```
feat(cashout): add auto-cashout at configurable multiplier
```

### Bug fix with body
```
fix(round): prevent orphaned ACTIVE rounds on service restart

On restart, the game service now detects rounds stuck in ACTIVE
status with no recent tick activity and forces a crash using the
pre-saved crash point. Prevents indefinite limbo for player bets.
```

### Breaking change in RabbitMQ schema
```
feat(rabbitmq): include username in wallet.debit payload

BREAKING CHANGE: wallet.debit message now requires a `username`
field in the data object. Wallet Service consumers must be updated
before deploying this version of Game Service.
```

### Build change
```
build(migrations): add index on bets.player_id
```

### Frontend design system
```
feat(design-system): migrate Jungle tokens to Tailwind v4 @theme

Removes tailwind.config.js. All tokens are now registered in
globals.css via @theme, generating utility classes automatically.
Semantic values (glows, focus-ring) remain in :root via var().
```
