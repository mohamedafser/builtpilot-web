import { EditMaterialScreen } from "@/components/materials/material-edit-screen";
import type { Metadata } from "next";

type EditMaterialPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Edit material",
};

export default async function EditMaterialPage({
  params,
}: EditMaterialPageProps) {
  const { id } = await params;
  return <EditMaterialScreen id={id} />;
}
