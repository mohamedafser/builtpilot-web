import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) {
    return null;
  }

  const lastIndex = items.length - 1;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === lastIndex;

          return (
            <li
              key={`${item.label}-${item.href ?? index}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              {index > 0 ? (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-stone-400"
                  strokeWidth={1.75}
                  aria-hidden
                />
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  title={item.label}
                  className="inline-flex min-h-9 max-w-[14rem] items-center truncate rounded-md px-1 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 sm:max-w-xs"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  title={item.label}
                  className={cn(
                    "inline-flex min-h-9 max-w-[14rem] items-center truncate px-1 text-sm sm:max-w-xs",
                    isLast
                      ? "font-medium text-stone-800"
                      : "font-medium text-stone-500",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
