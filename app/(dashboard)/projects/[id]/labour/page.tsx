import { ProjectLabourScreen } from "@/components/labour/project-labour-screen";
import { LabourDashboardSkeleton } from "@/components/labour/labour-skeletons";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";
import { Suspense } from "react";

type LabourPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: LabourPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.project) {
    return { title: "Labour" };
  }

  return { title: `Labour · ${result.project.name}` };
}

export default async function ProjectLabourPage({ params }: LabourPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<LabourDashboardSkeleton />}>
      <ProjectLabourScreen projectId={id} />
    </Suspense>
  );
}
