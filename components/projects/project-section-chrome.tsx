import { linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function ProjectSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs text-stone-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ProjectSectionPrimaryLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(linkButtonClassName("primary", "sm"))}>
      <WithIcon icon={icon}>{children}</WithIcon>
    </Link>
  );
}

export type CompactStat = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad" | "accent";
};

export function CompactStatStrip({ stats }: { stats: CompactStat[] }) {
  const xlCols =
    stats.length >= 6
      ? "xl:grid-cols-6"
      : stats.length === 5
        ? "xl:grid-cols-5"
        : "xl:grid-cols-4";

  return (
    <dl className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", xlCols)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "rounded-lg border px-3 py-2",
            stat.tone === "accent" && "border-amber-200 bg-amber-50/70",
            stat.tone === "good" && "border-emerald-200 bg-emerald-50/60",
            stat.tone === "warn" && "border-amber-200 bg-amber-50/60",
            stat.tone === "bad" && "border-red-200 bg-red-50/60",
            (!stat.tone || stat.tone === "default") &&
              "border-stone-200 bg-white",
          )}
        >
          <dt className="text-[11px] font-medium tracking-wide text-stone-500 uppercase">
            {stat.label}
          </dt>
          <dd
            className={cn(
              "mt-0.5 truncate text-base font-semibold tabular-nums",
              stat.tone === "bad" ? "text-red-700" : "text-stone-900",
            )}
          >
            {stat.value}
          </dd>
          {stat.hint ? (
            <p className="mt-0.5 truncate text-[11px] text-stone-500">
              {stat.hint}
            </p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function CompactPanel({
  title,
  action,
  toolbar,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4",
        className,
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {toolbar ? (
        <div className="mb-3 rounded-lg border border-stone-100 bg-stone-50/80 p-2.5">
          {toolbar}
        </div>
      ) : null}
      {children}
    </section>
  );
}
