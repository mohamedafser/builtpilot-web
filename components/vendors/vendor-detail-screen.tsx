"use client";

import { VendorDetail } from "@/components/vendors/vendor-detail";
import { VendorDetailSkeleton } from "@/components/vendors/vendor-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useVendor } from "@/hooks/use-vendor";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function VendorDetailScreen({ id }: { id: string }) {
  const { vendor, error, notFound, isLoading, reload } = useVendor(id);

  if (isLoading) return <VendorDetailSkeleton />;

  if (notFound) {
    return (
      <EmptyState
        title="Vendor not found"
        description="This vendor does not exist or you do not have access to them."
        action={
          <Link
            href="/vendors"
            className={cn(linkButtonClassName("secondary"))}
          >
            Back to vendors
          </Link>
        }
      />
    );
  }

  if (error) return <Alert variant="error">{error}</Alert>;
  if (!vendor) return null;
  return <VendorDetail vendor={vendor} onAssigned={() => void reload()} />;
}
