"use client";

import {
  Breadcrumbs,
  type BreadcrumbItem,
} from "@/components/layout/breadcrumbs";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export function VendorBreadcrumbs({
  vendorId,
  vendorName,
}: {
  vendorId: string;
  vendorName: string;
}) {
  const pathname = usePathname();
  const isEdit = pathname.endsWith("/edit");

  const items = useMemo<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
      { label: "Vendors", href: "/vendors" },
      {
        label: vendorName,
        href: isEdit ? `/vendors/${vendorId}` : undefined,
      },
    ];
    if (isEdit) trail.push({ label: "Edit" });
    return trail;
  }, [isEdit, vendorId, vendorName]);

  return <Breadcrumbs items={items} />;
}
