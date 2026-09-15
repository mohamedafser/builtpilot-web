import { ProjectMaterialsScreen } from "@/components/materials/project-materials-screen";
import { ProjectMaterialsSkeleton } from "@/components/materials/material-skeletons";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";
import { Suspense } from "react";

type MaterialsPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: MaterialsPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.project) {
    return { title: "Materials" };
  }

  return { title: `Materials · ${result.project.name}` };
}

export default async function ProjectMaterialsPage({
  params,
}: MaterialsPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<ProjectMaterialsSkeleton />}>
      <ProjectMaterialsScreen projectId={id} />
    </Suspense>
  );
}
