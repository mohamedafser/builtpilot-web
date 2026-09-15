import { WorkerDetailScreen } from "@/components/workers/worker-detail-screen";
import { getWorkerById } from "@/lib/workers/queries";
import type { Metadata } from "next";

type WorkerPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: WorkerPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getWorkerById(id);

  if (!result.worker) {
    return { title: "Worker" };
  }

  return { title: result.worker.name };
}

export default async function WorkerDetailPage({ params }: WorkerPageProps) {
  const { id } = await params;
  return <WorkerDetailScreen id={id} />;
}
