import { VendorListScreen } from "@/components/vendors/vendor-list-screen";
import { VendorListSkeleton } from "@/components/vendors/vendor-skeletons";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Vendors" };

export default function VendorsPage() {
  return (
    <Suspense fallback={<VendorListSkeleton />}>
      <VendorListScreen />
    </Suspense>
  );
}
