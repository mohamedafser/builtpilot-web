"use client";

import {
  Breadcrumbs,
  type BreadcrumbItem,
} from "@/components/layout/breadcrumbs";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export function WorkerBreadcrumbs({
  workerId,
  workerName,
}: {
  workerId: string;
  workerName: string;
}) {
  const pathname = usePathname();
  const isEdit = pathname.endsWith("/edit");

  const items = useMemo<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
      { label: "Workers", href: "/workers" },
      {
        label: workerName,
        href: isEdit ? `/workers/${workerId}` : undefined,
      },
    ];

    if (isEdit) {
      trail.push({ label: "Edit" });
    }

    return trail;
  }, [isEdit, workerId, workerName]);

  return <Breadcrumbs items={items} />;
}
