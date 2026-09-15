"use client";

import { CLIENT_PORTAL_NAV_ITEMS } from "@/constants/client-portal";
import { cn } from "@/lib/utils";
import { clientPortalHref } from "@/lib/client-portal/helpers";
import { isClientPortalModuleEnabled } from "@/lib/client-portal/permissions";
import type { ClientPortalSession } from "@/lib/client-portal/types";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ClientPortalNav({
  session,
}: {
  session: ClientPortalSession;
}) {
  const pathname = usePathname();
  const items = CLIENT_PORTAL_NAV_ITEMS.filter((item) =>
    isClientPortalModuleEnabled(session.settings, item.key),
  );

  return (
    <>
      <nav
        aria-label="Client portal"
        className="hidden border-b border-stone-200 bg-white md:block"
      >
        <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2">
          {items.map((item) => {
            const href = clientPortalHref(session.base, item.suffix);
            const active =
              item.suffix === ""
                ? pathname === href
                : pathname.startsWith(href);

            return (
              <li key={item.key}>
                <Link
                  href={href}
                  className={cn(
                    "inline-flex h-11 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap",
                    active
                      ? "bg-stone-900 text-white"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <nav
        aria-label="Client portal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white md:hidden"
      >
        <ul className="grid auto-cols-fr grid-flow-col gap-1 overflow-x-auto px-2 py-2">
          {items.map((item) => {
            const href = clientPortalHref(session.base, item.suffix);
            const active =
              item.suffix === ""
                ? pathname === href
                : pathname.startsWith(href);

            return (
              <li key={item.key}>
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-11 items-center justify-center rounded-md px-2 text-center text-xs font-medium",
                    active
                      ? "bg-stone-900 text-white"
                      : "text-stone-600",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
