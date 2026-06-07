import { cn } from "#/lib/cn";

interface PillSkeletonProps {
  className?: string;
}

export function PillSkeleton({ className }: PillSkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton-shimmer shrink-0 h-[26px] w-12 rounded-full border border-border",
        className,
      )}
    />
  );
}
