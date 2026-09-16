import { MaterialFilters } from "@/components/materials/material-filters";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

export default async function MaterialsIndexLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { business, role } = await getWorkspaceContext();

  if (!business) {
    return (
      <Alert variant="error">
        No business workspace was found for this account.
      </Alert>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-stone-500">Catalog for {business.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            {hasPermission(role, "materials.create") ? (
              <Link
                href="/materials/new"
                className={cn(linkButtonClassName("primary", "sm"))}
              >
                <WithIcon icon={Plus}>Add material</WithIcon>
              </Link>
            ) : null}
          </div>
        </div>
        <Suspense fallback={<div className="h-9" />}>
          <MaterialFilters />
        </Suspense>
      </div>
      {children}
    </>
  );
}
