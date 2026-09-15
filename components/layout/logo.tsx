import { cn } from "@/lib/utils";
import Link from "next/link";

export function Logo({
  href = "/",
  light = false,
  compact = false,
  className,
}: {
  href?: string;
  light?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2",
        compact && "lg:justify-center",
        className,
      )}
      title="BuildPilot"
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold",
          light ? "bg-amber-500 text-stone-950" : "bg-amber-600 text-white",
        )}
      >
        BP
      </span>
      <span
        className={cn(
          "text-base font-semibold tracking-tight",
          light ? "text-white" : "text-stone-900",
          compact && "lg:hidden",
        )}
      >
        BuildPilot
      </span>
    </Link>
  );
}
