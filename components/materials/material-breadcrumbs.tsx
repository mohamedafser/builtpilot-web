"use client";

import {
  Breadcrumbs,
  type BreadcrumbItem,
} from "@/components/layout/breadcrumbs";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export function MaterialBreadcrumbs({
  materialId,
  materialName,
}: {
  materialId: string;
  materialName: string;
}) {
  const pathname = usePathname();
  const isEdit = pathname.endsWith("/edit");

  const items = useMemo<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
      { label: "Materials", href: "/materials" },
      {
        label: materialName,
        href: isEdit ? `/materials/${materialId}` : undefined,
      },
    ];

    if (isEdit) {
      trail.push({ label: "Edit" });
    }

    return trail;
  }, [isEdit, materialId, materialName]);

  return <Breadcrumbs items={items} />;
}
