"use client";

import { WorkerDetail } from "@/components/workers/worker-detail";
import { WorkerDetailSkeleton } from "@/components/workers/worker-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorker } from "@/hooks/use-worker";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function WorkerDetailScreen({ id }: { id: string }) {
  const { worker, error, notFound, isLoading, reload } = useWorker(id);

  if (isLoading) {
    return <WorkerDetailSkeleton />;
  }

  if (notFound) {
    return (
      <EmptyState
        title="Worker not found"
        description="This worker does not exist or you do not have access to them."
        action={
          <Link
            href="/workers"
            className={cn(linkButtonClassName("secondary"))}
          >
            Back to workers
          </Link>
        }
      />
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!worker) {
    return null;
  }

  return <WorkerDetail worker={worker} onAssigned={() => void reload()} />;
}
