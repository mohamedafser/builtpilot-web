import { MaterialBreadcrumbs } from "@/components/materials/material-breadcrumbs";
import { getMaterialById } from "@/lib/materials/queries";
import type { ReactNode } from "react";

export default async function MaterialIdLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getMaterialById(id);

  return (
    <>
      <MaterialBreadcrumbs
        materialId={id}
        materialName={result.material?.name ?? "Material"}
      />
      {children}
    </>
  );
}
