---
paths:
  - "frontend/src/**/*.tsx"
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.css"
---

# Frontend Conventions

## Design System: Jungle

- Use CSS custom properties (`--token-name`) for all colors, spacing, radii, and typography. Never hardcode hex values.
- The design system is a dark theme. Background family is green-jungle (`--bg-base` to `--surface-elev`).
- Gold (`--gold-500`) is ONLY for wallet/balance/jackpot displays. Never use it as a generic accent.
- Elevation uses colored neon glows, not neutral box-shadows. Match glow color to element purpose.
- All numerals in multipliers, balances, and hashes MUST use `font-variant-numeric: tabular-nums` and the mono font (`--font-mono` / JetBrains Mono).
- History pills are color-coded by crash point range: bust(<2x)=red, 2-10x=lime, 10-50x=gold, 50x+=magenta.

### Tailwind v4 — No Config File

- **There is no `tailwind.config.js` or `tailwind.config.ts`.** Never create one. Tailwind v4 is configured entirely via CSS.
- All design tokens are registered in `globals.css` using `@theme`. This generates Tailwind utility classes automatically:
  ```css
  @theme {
    --color-lime-500: #B8FF3C;   /* → bg-lime-500, text-lime-500, border-lime-500 */
    --color-gold-500: #FFC247;   /* → bg-gold-500, text-gold-500 */
    --font-mono: "JetBrains Mono", ui-monospace, monospace; /* → font-mono */
    --radius-md: 12px;           /* → rounded-md */
  }
  ```
- Semantic values that cannot be used as Tailwind utilities (glows, focus rings, `.jg-*` component classes) live in `:root` and `@layer components` inside `globals.css`, consumed via `var()`.
- Use generated utility classes in JSX: `bg-lime-500`, `text-fg-2`, `font-mono`, `rounded-md`, etc.
- Use `var(--glow-lime)` directly on `box-shadow` for neon glow effects — these are not Tailwind utilities.

## State Management

- **Zustand** for all real-time game state (current round, multiplier, bet list, round status).
- **TanStack Query** for async server state (wallet balance, bet history, round history).
- Socket.IO event handlers write directly to the Zustand store. Components subscribe to store slices.
- Never use React Context for game state. Zustand is the single source of truth for real-time data.
- On WebSocket reconnect, call `GET /games/rounds/current` to re-hydrate the Zustand store.

## Component Architecture

- Primitive design system components (Button, Badge, Input, Card) go in a shared `components/ui/` directory and are documented in Storybook.
- Page-level and business logic components are NOT documented in Storybook — avoid mocking overhead.
- Use shadcn/ui as the base and customize with Jungle tokens. Do not use shadcn defaults.

## Multiplier Animation

- Calculate locally: `Math.exp(elapsed * growthRate)` where `elapsed = (Date.now() - startedAt) / 1000`.
- Use `round:tick` events only for clock drift correction, not as the animation driver.
- Use `requestAnimationFrame` for smooth visual updates, not `setInterval`.
- Display multiplier with exactly 2 decimal places.

## Auth Flow

- Use `oidc-client-ts` for PKCE flow with Keycloak.
- Tokens are managed client-side. Attach `Authorization: Bearer <token>` to all API requests.
- All REST calls go through Kong at `VITE_API_BASE_URL`. Never call services directly.

## Error Handling

- API responses follow the envelope format `{ data, meta, error }`.
- Check `error` field first. If present, display the `error.message` to the user.
- Use TanStack Query's `onError` callbacks for toast notifications on failed mutations.
