"use client";

import { WorkerForm } from "@/components/workers/worker-form";
import { WorkerFormSkeleton } from "@/components/workers/worker-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorker } from "@/hooks/use-worker";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function EditWorkerScreen({ id }: { id: string }) {
  const { worker, error, notFound, isLoading } = useWorker(id);

  if (isLoading) {
    return <WorkerFormSkeleton />;
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

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Edit worker</CardTitle>
        <p className="mt-1 text-sm text-stone-500">
          Update details for {worker.name}. Changing daily wage does not change
          historical attendance costs.
        </p>
      </CardHeader>
      <CardContent>
        <WorkerForm worker={worker} />
      </CardContent>
    </Card>
  );
}
