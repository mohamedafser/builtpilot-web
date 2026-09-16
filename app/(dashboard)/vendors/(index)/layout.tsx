import { VendorFilters } from "@/components/vendors/vendor-filters";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

export default async function VendorsIndexLayout({
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
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-500">
            Suppliers for {business.name}.
          </p>
          {hasPermission(role, "vendors.create") ? (
            <Link href="/vendors/new" className={cn(linkButtonClassName())}>
              <WithIcon icon={Plus}>Add vendor</WithIcon>
            </Link>
          ) : null}
        </div>
        <Suspense fallback={<div className="h-12" />}>
          <VendorFilters />
        </Suspense>
      </div>
      {children}
    </>
  );
}
