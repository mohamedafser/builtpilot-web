import { EditWorkerScreen } from "@/components/workers/worker-edit-screen";
import type { Metadata } from "next";

type EditWorkerPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Edit worker",
};

export default async function EditWorkerPage({
  params,
}: EditWorkerPageProps) {
  const { id } = await params;
  return <EditWorkerScreen id={id} />;
}
