import { type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "#/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-ui font-semibold transition-all duration-[--dur-fast] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none enabled:active:scale-95 ",
  {
    variants: {
      variant: {
        primary: "bg-lime-500 text-fg-on-lime enabled:hover:bg-lime-400 lime-neon",
        secondary: "bg-transparent text-lime-400 border-[1.5px] border-solid border-neon enabled:hover:border-lime-400 enabled:hover:text-lime-300",
        ghost: "bg-surface-2 text-fg-1 enabled:hover:bg-surface-elev",
        danger: "bg-loss-500 text-fg-on-mag loss-neon enabled:hover:opacity-90",
      },
      size: {
        sm: "px-3 py-1 text-xs rounded-sm",
        md: "px-5 py-1.5 text-sm  rounded-md",
        lg: "px-6 py-2 text-base rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
