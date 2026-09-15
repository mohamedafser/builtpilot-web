"use client";

import {
  Breadcrumbs,
  type BreadcrumbItem,
} from "@/components/layout/breadcrumbs";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export function QuotationBreadcrumbs({
  quotationId,
  quotationNumber,
}: {
  quotationId: string;
  quotationNumber: string;
}) {
  const pathname = usePathname();
  const isEdit = pathname.endsWith("/edit");

  const items = useMemo<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
      { label: "Quotations", href: "/quotations" },
      {
        label: quotationNumber,
        href: isEdit ? `/quotations/${quotationId}` : undefined,
      },
    ];

    if (isEdit) {
      trail.push({ label: "Edit" });
    }

    return trail;
  }, [isEdit, quotationId, quotationNumber]);

  return <Breadcrumbs items={items} />;
}
