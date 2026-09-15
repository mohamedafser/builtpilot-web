"use client";

import { VendorForm } from "@/components/vendors/vendor-form";
import { VendorFormSkeleton } from "@/components/vendors/vendor-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useVendor } from "@/hooks/use-vendor";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function EditVendorScreen({ id }: { id: string }) {
  const { vendor, error, notFound, isLoading } = useVendor(id);

  if (isLoading) return <VendorFormSkeleton />;

  if (notFound) {
    return (
      <EmptyState
        title="Vendor not found"
        description="This vendor does not exist or you do not have access to them."
        action={
          <Link href="/vendors" className={cn(linkButtonClassName("secondary"))}>
            Back to vendors
          </Link>
        }
      />
    );
  }

  if (error) return <Alert variant="error">{error}</Alert>;
  if (!vendor) return null;

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Edit vendor</CardTitle>
        <p className="mt-1 text-sm text-stone-500">
          Update contact details for {vendor.name}.
        </p>
      </CardHeader>
      <CardContent>
        <VendorForm vendor={vendor} />
      </CardContent>
    </Card>
  );
}
