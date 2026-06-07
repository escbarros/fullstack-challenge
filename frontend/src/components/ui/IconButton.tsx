import { type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { type LucideIcon } from "lucide-react";
import { cn } from "#/lib/cn";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center transition-all duration-[--dur-fast] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none active:scale-95 shrink-0 rounded-full p-1",
  {
    variants: {
      variant: {
        primary: "bg-lime-500 text-fg-on-lime hover:bg-lime-400 lime-neon",
        secondary: "bg-transparent text-lime-400 border-[1.5px] border-solid border-neon hover:border-lime-400 hover:text-lime-300",
        ghost: "bg-surface-2 text-fg-1 hover:bg-surface-elev",
        danger: "bg-loss-500 text-fg-on-mag loss-neon hover:opacity-90",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: LucideIcon;
  size?: number
  iconProps?: React.ComponentProps<LucideIcon>;
}

export function IconButton({ variant, size=12, className, icon: Icon, iconProps, ...props }: IconButtonProps) {

  return (
    <button
      className={cn(iconButtonVariants({ variant }), className)}
      {...props}
    >
      <Icon size={size} {...iconProps} />
    </button>
  );
}
