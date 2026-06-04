---
name: spec
description: "Write a Spec-Driven Development specification for a feature before any code is written. Produces a structured spec document with acceptance criteria, API contracts, state transitions, and edge cases."
tools:
  - Read
  - Write
  - Edit
---

# Write Feature Specification

## Purpose

Generate a detailed, implementation-ready specification document before writing any code. The spec becomes the source of truth for the feature and is stored in `docs/specs/`.

## Trigger

Run with: `/spec <feature-name>`

## Workflow

### Step 1 — Gather Context

1. Read the root `CLAUDE.md` for architecture overview.
2. Read the relevant service-level `CLAUDE.md` (game-service, wallet-service, or frontend) based on the feature scope.
3. If the feature touches existing code, read the related entities, use cases, and controllers to understand current state.
4. If a related spec already exists in `docs/specs/`, read it to avoid contradictions.

### Step 2 — Write the Spec

Create a new file at `docs/specs/<feature-name>.md` with the following structure:

```markdown
# Spec: <Feature Name>

## Status: DRAFT | APPROVED | IMPLEMENTED

## Summary
One paragraph describing what this feature does and why it exists.

## User Stories
- As a [role], I want to [action] so that [benefit].
- (list all relevant stories)

## Scope
### In Scope
- (what this feature covers)

### Out of Scope
- (what this feature explicitly does NOT cover)

## Technical Design

### Affected Services
- [ ] game-service
- [ ] wallet-service
- [ ] frontend

### API Changes
(New or modified endpoints with full request/response examples in envelope format)

### Database Changes
(New tables, columns, indexes, or migrations needed)

### Message Queue Changes
(New RabbitMQ events or modifications to existing ones)

### WebSocket Events
(New events or payload changes)

### State Transitions
(How round/bet/wallet states are affected)

## Edge Cases & Error Scenarios
| Scenario | Expected Behavior | HTTP/WS Response |
|----------|-------------------|------------------|
| ... | ... | ... |

## Acceptance Criteria
- [ ] (testable criterion 1)
- [ ] (testable criterion 2)
- [ ] ...

## Dependencies
- (other features or infrastructure this depends on)

## Open Questions
- (unresolved decisions that need team input)
```

### Step 3 — Validate Consistency

After writing the spec:
1. Verify API payloads match the existing envelope format (`{ data, meta, error }`).
2. Verify monetary values are in integer cents with `BIGINT`.
3. Verify state transitions don't violate the round/bet state machines.
4. Verify RabbitMQ events include idempotency keys.
5. Verify the feature doesn't expose wallet debit/credit via REST (RabbitMQ only).

### Step 4 — Present

Output the spec file path and a brief summary of key decisions and open questions for the developer to review before implementation begins.
