import { Gem } from "lucide-react";
import { cn } from "#/lib/cn";

interface BalancePillProps {
  /** Formatted balance, e.g. "0,000.00". */
  value: string;
  currency?: string;
  className?: string;
}

export function BalancePill({ value, currency = "BRL", className }: BalancePillProps) {
  return (
    <div
      className={cn(
        "px-3 py-0.5 bg-surface-1 rounded-full flex items-center gap-2 border border-border",
        className,
      )}
    >
      <Gem size={14} className="text-gold-500" />
      <span className="text-gold-400 text-base font-semibold font-mono tabular-nums">{value}</span>
      <span className="text-xs text-fg-3">{currency}</span>
    </div>
  );
}
