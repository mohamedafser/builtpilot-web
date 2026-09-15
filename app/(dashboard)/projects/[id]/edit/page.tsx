import { EditProjectScreen } from "@/components/projects/edit-project-screen";
import type { Metadata } from "next";

type EditProjectPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Edit project",
};

export default async function EditProjectPage({
  params,
}: EditProjectPageProps) {
  const { id } = await params;
  return <EditProjectScreen id={id} />;
}
