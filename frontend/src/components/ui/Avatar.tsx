import { cn } from "#/lib/cn";

interface AvatarProps {
  seed?: string;
  className?: string;
}

export function Avatar({ seed, className }: AvatarProps) {
  return (
    <img
      src={`https://api.dicebear.com/10.x/glass/svg?seed=${seed ?? ""}`}
      alt={seed ? `${seed} avatar` : "avatar"}
      className={cn(
        "size-9 rounded-full outline-2 outline-offset-2 outline-border",
        className,
      )}
    />
  );
}
