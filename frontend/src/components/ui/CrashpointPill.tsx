import { cn } from "#/lib/cn";
import type { HistoryItem } from "#/store/game"
import { cva } from "class-variance-authority";

const pillVariants = cva(
  "select-none text-[10px] border font-mono font-bold px-2.5 py-1 rounded-full shrink-0",
  {
    variants: {
      variant: {
        low: "border-danger text-danger bg-danger/10",
        medium: "border-lime text-lime bg-lime/10",
        high: "border-gold text-gold bg-gold/10",
        ultra: "border-magenta text-magenta bg-magenta/10",
      },
    },
    defaultVariants: {
      variant: "low",
    },
  }
);

interface CrashpointPillProps {
  item: HistoryItem
}
export function CrashpointPill({ item }: CrashpointPillProps) {
  let variant: "low" | "medium" | "high" | "ultra";

  if (item.crashPoint < 2) {
    variant = "low";
  } else if (item.crashPoint < 10) {
    variant = "medium";
  } else if (item.crashPoint < 20) {
    variant = "high";
  } else {
    variant = "ultra";
  }
  return (
    <div
      key={item.id}
      className={cn(pillVariants({ variant }))}
    >
      {item.crashPoint.toFixed(2)}×
    </div>
  )
}
