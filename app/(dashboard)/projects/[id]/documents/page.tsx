import { ProjectDocumentsScreen } from "@/components/projects/project-documents-screen";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";
import { Suspense } from "react";

type DocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: DocumentsPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.project) {
    return { title: "Documents" };
  }

  return { title: `Documents · ${result.project.name}` };
}

export default async function ProjectDocumentsPage({
  params,
}: DocumentsPageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <ProjectDocumentsScreen projectId={id} />
    </Suspense>
  );
}
