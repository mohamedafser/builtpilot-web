import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Consistent icon + label row for buttons and links. */
export function WithIcon({
  icon: Icon,
  children,
  className,
  iconClassName,
}: {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center justify-center gap-2", className)}>
      <Icon className={cn("h-4 w-4 shrink-0", iconClassName)} strokeWidth={1.75} aria-hidden />
      {children}
    </span>
  );
}
