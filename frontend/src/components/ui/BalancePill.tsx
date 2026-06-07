import { Gem } from "lucide-react";
import { cn } from "#/lib/cn";
import { useGameStore } from "#/store/game";

interface BalancePillProps {
  currency?: string;
  className?: string;
}
function formatMoney(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
export function BalancePill({ currency = "BRL", className }: BalancePillProps) {
  const wallet = useGameStore((s) => s.wallet);
  return (
    <div
      className={cn(
        "px-3 py-0.5 bg-surface-1 rounded-full flex items-center gap-2 border border-border",
        className,
      )}
    >
      <Gem size={14} className="text-gold-500" />
      <span className="text-gold-400 text-base font-semibold font-mono tabular-nums">{formatMoney(parseInt(wallet?.balanceCents ?? "0"))}</span>
      <span className="text-xs text-fg-3">{currency}</span>
    </div>
  );
}
