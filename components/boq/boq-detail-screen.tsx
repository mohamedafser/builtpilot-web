"use client";

import { BoqDetailView } from "@/components/boq/boq-detail";
import { BoqDetailSkeleton } from "@/components/boq/boq-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useApiData } from "@/hooks/use-api-data";
import type { BoqDetail } from "@/lib/boq/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

export function BoqDetailScreen({
  projectId,
  boqId,
}: {
  projectId: string;
  boqId: string;
}) {
  const [tick, setTick] = useState(0);
  const { data, error, isLoading } = useApiData<{ boq: BoqDetail }>(
    `/api/projects/${projectId}/boq/${boqId}?_=${tick}`,
  );

  if (isLoading) {
    return <BoqDetailSkeleton />;
  }

  if (error === "BOQ not found.") {
    return (
      <EmptyState
        title="BOQ not found"
        description="This BOQ does not exist or you do not have access to it."
        action={
          <Link
            href={`/projects/${projectId}/boq`}
            className={cn(linkButtonClassName("secondary"))}
          >
            Back to BOQ
          </Link>
        }
      />
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!data?.boq) {
    return null;
  }

  return (
    <BoqDetailView
      projectId={projectId}
      boq={data.boq}
      onUpdated={() => setTick((current) => current + 1)}
    />
  );
}
