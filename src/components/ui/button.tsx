import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost";
type Size = "default" | "sm" | "icon";

const variantClasses: Record<Variant, string> = {
  default: "bg-neutral-900 text-white hover:bg-neutral-700 disabled:bg-neutral-300",
  outline: "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50",
  ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
};

const sizeClasses: Record<Size, string> = {
  default: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-sm",
  icon: "h-9 w-9",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
