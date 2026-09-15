import { BoqDetailScreen } from "@/components/boq/boq-detail-screen";
import { getBoqById } from "@/lib/boq/queries";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type BoqDetailPageProps = {
  params: Promise<{ id: string; boqId: string }>;
};

export async function generateMetadata({
  params,
}: BoqDetailPageProps): Promise<Metadata> {
  const { id, boqId } = await params;
  const result = await getBoqById(id, boqId);

  if (!result.boq) {
    return { title: "BOQ" };
  }

  return { title: `${result.boq.name} · BOQ` };
}

export default async function BoqDetailPage({ params }: BoqDetailPageProps) {
  const { id, boqId } = await params;
  const project = await getProjectById(id);

  if (project.error === "not_found") {
    notFound();
  }

  return <BoqDetailScreen projectId={id} boqId={boqId} />;
}
