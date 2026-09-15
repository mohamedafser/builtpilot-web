import { BoqListScreen } from "@/components/boq/boq-list-screen";
import { BoqListSkeleton } from "@/components/boq/boq-skeletons";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";
import { Suspense } from "react";

type ProjectBoqPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProjectBoqPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.project) {
    return { title: "BOQ" };
  }

  return { title: `BOQ · ${result.project.name}` };
}

export default async function ProjectBoqPage({ params }: ProjectBoqPageProps) {
  const { id } = await params;
  const result = await getProjectById(id);

  return (
    <Suspense fallback={<BoqListSkeleton />}>
      <BoqListScreen projectId={id} projectName={result.project?.name} />
    </Suspense>
  );
}
