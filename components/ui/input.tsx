import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, error, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md border bg-white px-3 text-sm text-stone-900 shadow-sm transition outline-none placeholder:text-stone-400 focus:ring-2",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : "border-stone-300 focus:border-amber-500 focus:ring-amber-100",
          className,
        )}
        {...props}
      />
    );
  },
);
