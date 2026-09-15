import { ProjectDetailScreen } from "@/components/projects/project-detail-screen";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.project) {
    return { title: "Project" };
  }

  return { title: result.project.name };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { id } = await params;
  return <ProjectDetailScreen id={id} />;
}
