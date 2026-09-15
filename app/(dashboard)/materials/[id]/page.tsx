import { MaterialDetailScreen } from "@/components/materials/material-detail-screen";
import { getMaterialById } from "@/lib/materials/queries";
import type { Metadata } from "next";

type MaterialPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: MaterialPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getMaterialById(id);

  if (!result.material) {
    return { title: "Material" };
  }

  return { title: result.material.name };
}

export default async function MaterialDetailPage({ params }: MaterialPageProps) {
  const { id } = await params;
  return <MaterialDetailScreen id={id} />;
}
