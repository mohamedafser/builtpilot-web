import { ProjectBreadcrumbs } from "@/components/projects/project-breadcrumbs";
import { ProjectSectionNav } from "@/components/projects/project-section-nav";
import { getProjectById } from "@/lib/projects/queries";
import type { ReactNode } from "react";

export default async function ProjectIdLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProjectById(id);

  return (
    <>
      <ProjectBreadcrumbs
        projectId={id}
        projectName={result.project?.name ?? "Project"}
      />
      <ProjectSectionNav projectId={id} />
      {children}
    </>
  );
}
