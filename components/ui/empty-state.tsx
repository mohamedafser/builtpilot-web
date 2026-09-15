import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-stone-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-stone-500">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
