import { NewBoqScreen } from "@/components/boq/boq-form-screens";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";

type NewProjectBoqPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewProjectBoqPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.project) {
    return { title: "New BOQ" };
  }

  return { title: `New BOQ · ${result.project.name}` };
}

export default async function NewProjectBoqPage({
  params,
}: NewProjectBoqPageProps) {
  const { id } = await params;
  return <NewBoqScreen projectId={id} />;
}
