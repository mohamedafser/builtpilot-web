import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function AuthPanel({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-stone-200/80 bg-white/90 p-6 shadow-[0_20px_50px_-28px_rgba(28,25,23,0.35)] backdrop-blur-sm sm:p-8",
        className,
      )}
    >
      <div className="mb-6">
        <h1
          className={cn(
            "font-[family-name:var(--font-auth-display)] text-2xl font-semibold tracking-tight text-stone-950 sm:text-[1.75rem]",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-stone-500">{description}</p>
        ) : null}
      </div>
      {children}
      {footer ? <div className="mt-6 border-t border-stone-100 pt-5">{footer}</div> : null}
    </div>
  );
}
