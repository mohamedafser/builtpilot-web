import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: LucideIcon;
  children?: ReactNode;
};

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-amber-600 text-white hover:bg-amber-700 focus-visible:outline-amber-600",
  secondary:
    "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 focus-visible:outline-stone-400",
  ghost: "text-stone-700 hover:bg-stone-100 focus-visible:outline-stone-400",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export function linkButtonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    buttonVariants[variant],
    sizeClasses[size],
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth = false,
  type = "button",
  disabled,
  icon: Icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      ) : null}
      {children}
    </button>
  );
}
