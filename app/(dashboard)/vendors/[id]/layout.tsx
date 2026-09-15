import { VendorBreadcrumbs } from "@/components/vendors/vendor-breadcrumbs";
import { getVendorById } from "@/lib/vendors/queries";
import type { ReactNode } from "react";

export default async function VendorIdLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getVendorById(id);

  return (
    <>
      <VendorBreadcrumbs
        vendorId={id}
        vendorName={result.vendor?.name ?? "Vendor"}
      />
      {children}
    </>
  );
}
