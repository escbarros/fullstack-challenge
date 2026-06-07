import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "#/lib/cn";
import { type LucideIcon } from "lucide-react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon | React.ElementType;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, icon: Icon, id, disabled, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2.5 w-full">
        {label && (
          <label htmlFor={id} className=" text-fg-3 font-bold font-ui uppercase text-xs">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3 pointer-events-none">
              <Icon size={16} className={disabled ? "text-gold-500" : "text-gold-500/50"} />
            </div>
          )}
          <input
            id={id}
            ref={ref}
            className={cn(
              "w-full font-mono lime-neon bg-surface-2 border-lime-800 border text-white rounded-md py-3 px-2",
              "focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/50 transition-colors",
              "placeholder:text-fg-2 font-ui text-2xl font-bold font-mono",
              "disabled:opacity-50 disabled:placeholder:text-fg-3 disabled:cursor-not-allowed",
              Icon ? "pl-9" : "",
              className
            )}
            disabled={disabled}
            {...props}
          />
        </div>
      </div>
    );
  }
);

Input.displayName = "Input";
