import { cn } from "@/lib/utils";
import type { Ref, TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({ className, error, ref, ...props }: TextareaProps) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-md border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm transition outline-none placeholder:text-stone-400 focus:ring-2",
        error
          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
          : "border-stone-300 focus:border-amber-500 focus:ring-amber-100",
        className,
      )}
      {...props}
    />
  );
}
