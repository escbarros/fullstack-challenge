import { type HTMLAttributes } from "react";
import { cn } from "#/lib/cn";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {}

export function Panel({ className, children, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 bg-surface-1 border border-border rounded-2xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
