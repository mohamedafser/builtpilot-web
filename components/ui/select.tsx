import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
};

export function Select({ className, error, disabled, children, ...props }: SelectProps) {
  return (
    <select
      disabled={disabled}
      className={cn(
        "h-10 w-full rounded-md border px-3 text-sm shadow-sm transition outline-none focus:ring-2",
        disabled
          ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-500"
          : "bg-white text-stone-900",
        error
          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
          : !disabled &&
              "border-stone-300 focus:border-amber-500 focus:ring-amber-100",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
