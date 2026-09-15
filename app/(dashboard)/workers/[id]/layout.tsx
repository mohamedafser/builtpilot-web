import { WorkerBreadcrumbs } from "@/components/workers/worker-breadcrumbs";
import { getWorkerById } from "@/lib/workers/queries";
import type { ReactNode } from "react";

export default async function WorkerIdLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getWorkerById(id);

  return (
    <>
      <WorkerBreadcrumbs
        workerId={id}
        workerName={result.worker?.name ?? "Worker"}
      />
      {children}
    </>
  );
}
