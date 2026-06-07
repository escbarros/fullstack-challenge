import { useAuth } from "#/hooks/useAuth";
import { useGameStore, type Bet } from "#/store/game";
import { cn } from "#/lib/cn";

const AVATAR_COLORS = [
  "#3DF07A",
  "#FF3DA6",
  "#34E5FF",
  "#FFC247",
  "#B8FF3C",
  "#FF4D4D",
  "#A78BFA",
  "#FB923C",
];

function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function fmtBRL(cents: number): string {
  const val = cents / 100;
  if (Number.isInteger(val)) {
    return val >= 1000 ? val.toLocaleString("pt-BR") : String(val);
  }
  return val.toFixed(2);
}

function MultCell({ bet, roundStatus }: { bet: Bet; roundStatus: string }) {
  if (bet.status === "cashedout" && bet.cashoutMultiplier != null) {
    return (
      <span className="text-lime-500 font-mono tabular-nums">
        {bet.cashoutMultiplier.toFixed(2)}x
      </span>
    );
  }
  if (bet.status === "lost") {
    return <span className="text-fg-3 font-mono">—</span>;
  }
  if (roundStatus === "active") {
    return <span className="text-fg-3 text-xs italic">riding</span>;
  }
  return <span className="text-fg-3 font-mono">—</span>;
}

function PayoutCell({ bet, roundStatus }: { bet: Bet; roundStatus: string }) {
  if (bet.status === "cashedout" && bet.payoutCents != null) {
    const profit = Math.floor(bet.payoutCents - bet.amountCents);
    return (
      <span className="text-win-500 font-mono tabular-nums font-semibold">
        +{fmtBRL(profit)}
      </span>
    );
  }
  if (bet.status === "lost") {
    return (
      <span className="text-loss-500 font-mono tabular-nums">
        -{fmtBRL(bet.amountCents)}
      </span>
    );
  }
  if (roundStatus === "active") {
    return <span className="text-fg-3">…</span>;
  }
  return <span className="text-fg-3 font-mono">—</span>;
}

export function BetsList() {
  const { user } = useAuth();
  const bets = useGameStore((s) => s.bets);
  const status = useGameStore((s) => s.status);

  const ownUsername = user?.profile.preferred_username ?? user?.profile.name;

  return (
    <div className="overflow-hidden w-full h-full rounded-xl flex flex-col gap-2 p-4">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-2 pb-1 border-b border-border">
        <span className="text-xs text-fg-3 uppercase tracking-wide">Player</span>
        <span className="text-xs text-fg-3 uppercase tracking-wide text-right">Bet</span>
        <span className="text-xs text-fg-3 uppercase tracking-wide text-right w-14">Mult</span>
        <span className="text-xs text-fg-3 uppercase tracking-wide text-right w-16">Payout</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-0.5">
        {bets.length === 0 && (
          <p className="text-fg-3 text-sm text-center mt-8">No bets yet</p>
        )}
        {bets.map((bet) => {
          const isOwn = bet.username === ownUsername;
          return (
            <div
              key={bet.betId}
              className={cn(
                "grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-2 py-2 rounded-lg transition-colors",
                isOwn ? "bg-surface-2" : "hover:bg-surface-2/50",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: avatarColor(bet.username) }}
                />
                <span
                  className={cn(
                    "truncate text-sm",
                    isOwn ? "text-fg-1 font-semibold" : "text-fg-2",
                  )}
                >
                  {bet.username}
                </span>
              </div>

              <span className="text-fg-2 font-mono tabular-nums text-sm text-right">
                {fmtBRL(bet.amountCents)}
              </span>

              <div className="text-right w-14 text-sm">
                <MultCell bet={bet} roundStatus={status} />
              </div>

              <div className="text-right w-16 text-sm">
                <PayoutCell bet={bet} roundStatus={status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
