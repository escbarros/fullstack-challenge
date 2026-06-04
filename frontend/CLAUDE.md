# Frontend

TanStack Start application with React, implementing the Crash Game UI with real-time multiplier animation and the "Jungle" design system.

## Tech Stack

| Concern | Library |
|---------|---------|
| Framework | TanStack Start (file-based routing, SSR) |
| Async state | TanStack Query (HTTP requests, cache) |
| Real-time state | Zustand (WebSocket-driven game state) |
| WebSocket | Socket.IO client (auto-reconnect, long-polling fallback) |
| Styling | Tailwind CSS v4 — tokens via `@theme` in `globals.css`, no `tailwind.config.js` |
| Components | shadcn/ui base + custom Jungle design system |
| Auth | `oidc-client-ts` (PKCE flow with Keycloak) |
| Docs | Storybook for primitive design system components only |

## State Architecture

- **TanStack Query** — REST data: wallet balance, bet history, round history
- **Zustand store** — Real-time game state written by Socket.IO handlers
- Components read from Zustand directly, no intermediate React contexts
- Socket.IO handlers → Zustand store → React re-renders

## WebSocket Connection

- Single room: `game` (fixed, no round ID)
- On connect: `GET /games/rounds/current` to hydrate initial state
- On reconnect: same hydration call to recover missed events
- All player actions go through REST, never WebSocket

## Multiplier Calculation (Client-Side)

```
multiplier = e^(elapsed × growthRate)
elapsed = Date.now() - startedAt
```

The server sends `startedAt` via `round:started`. Periodic `round:tick` events correct clock drift. The multiplier is **never** fetched from the server.

## Commands

```bash
npm run dev         # Dev server
npm run build       # Production build
npm run preview     # Preview production build
npm run storybook   # Component documentation
npm run lint        # ESLint
npm run typecheck   # TypeScript check
```

## Design System: Jungle

All tokens are CSS custom properties consumed by Tailwind.

### Color Families
- **Backgrounds** — Dark green-jungle: `--bg-base` (#070B09) → `--surface-elev` (#1F2E25)
- **Primary (Lime)** — CTAs, multiplier curve: `--lime-500` (#B8FF3C)
- **Accent (Magenta)** — Live elements, secondary CTAs: `--magenta-500` (#FF3DA6)
- **Accent (Cyan)** — Info, links: `--cyan-500` (#34E5FF)
- **Gold** — Wallet/balance only: `--gold-500` (#FFC247). Never as generic accent
- **Win/Loss** — `--win-500` (#3DF07A) for cashout, `--loss-500` (#FF4D4D) for crash
- **Heat scale** — History pills: bust=red, 2-10x=lime, 10-50x=gold, 50x+=magenta

### Typography
| Family | Variable | Use |
|--------|----------|-----|
| Space Grotesk | `--font-display` | Headings, display |
| Manrope | `--font-ui` | Interface, body text |
| JetBrains Mono | `--font-mono` | Multipliers, balances, hashes |

All numerals use `font-variant-numeric: tabular-nums` to prevent jitter during animation.

### Key Tokens
- Spacing: 4px base grid (`--space-1` through `--space-20`)
- Radii: `--radius-xs` (6px) to `--radius-pill` (999px)
- Elevation: Colored neon glows (`--glow-lime`, `--glow-magenta`, etc.), not neutral shadows
- Motion: `--ease-out`, `--ease-snap` (overshoot), `--dur-fast` (120ms) to `--dur-slow` (360ms)

## Conventions

- All API calls go through Kong at `VITE_API_BASE_URL` (port 8000)
- Storybook documents only primitive design system components, not page components
- No mocking business logic in Storybook — keep it for visual components only
