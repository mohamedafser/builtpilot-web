"use client";

import { linkButtonClassName } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export function ForbiddenPanel({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const { t } = useLocale();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100">
        <ShieldAlert className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-stone-900">
        {title ?? t("permissions.forbiddenTitle")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        {description ?? t("permissions.forbiddenBody")}
      </p>
      <Link href="/dashboard" className={cn(linkButtonClassName(), "mt-6")}>
        {t("permissions.backHome")}
      </Link>
    </div>
  );
}
