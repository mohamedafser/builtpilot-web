"use client";

import { BoqItemCard } from "@/components/boq/boq-item-card";
import { BoqDetailSkeleton } from "@/components/boq/boq-skeletons";
import { MeasurementForm } from "@/components/boq/measurement-form";
import { MeasurementHistory } from "@/components/boq/measurement-history";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useApiData } from "@/hooks/use-api-data";
import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import { boqActions } from "@/lib/boq/calculations";
import type {
  BoqItemDetail,
  BoqMeasurementListResult,
} from "@/lib/boq/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function BoqItemDetailScreen({
  projectId,
  boqId,
  itemId,
}: {
  projectId: string;
  boqId: string;
  itemId: string;
}) {
  const [tick, setTick] = useState(0);
  const searchParams = useSearchParams();
  const page = searchParams.get("page") ?? "1";
  const pageSize = searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE);
  const { data, error, isLoading } = useApiData<BoqItemDetail>(
    `/api/projects/${projectId}/boq/${boqId}/items/${itemId}?_=${tick}`,
  );
  const measurements = useApiData<BoqMeasurementListResult>(
    `/api/projects/${projectId}/boq/${boqId}/items/${itemId}/measurements?page=${page}&page_size=${pageSize}&_=${tick}`,
  );

  if (isLoading) {
    return <BoqDetailSkeleton />;
  }

  if (error === "BOQ item not found.") {
    return (
      <EmptyState
        title="BOQ item not found"
        description="This item does not exist or you do not have access to it."
        action={
          <Link
            href={`/projects/${projectId}/boq/${boqId}`}
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

  if (!data) {
    return null;
  }

  const canMeasure = boqActions(data.boq.status).measure;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${projectId}/boq/${boqId}`}
          className="text-sm font-medium text-amber-700 hover:text-amber-800"
        >
          Back to {data.boq.name}
        </Link>
        <h2 className="mt-2 text-2xl font-semibold text-stone-900">
          {data.item.description}
        </h2>
        {data.section ? (
          <p className="mt-1 text-sm text-stone-500">{data.section.name}</p>
        ) : null}
      </div>

      <BoqItemCard
        projectId={projectId}
        boqId={boqId}
        item={data.item}
        showMeasure={false}
      />

      {canMeasure ? (
        <Card>
          <CardHeader>
            <CardTitle>Add measurement</CardTitle>
          </CardHeader>
          <CardContent>
            <MeasurementForm
              projectId={projectId}
              boqId={boqId}
              item={data.item}
              onSaved={() => setTick((current) => current + 1)}
            />
          </CardContent>
        </Card>
      ) : (
        <Alert>
          Measurements can only be added to draft or active BOQs.
        </Alert>
      )}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-stone-900">
          Measurement history
        </h3>
        {measurements.error ? (
          <Alert variant="error">{measurements.error}</Alert>
        ) : measurements.data ? (
          <MeasurementHistory
            projectId={projectId}
            boqId={boqId}
            itemId={itemId}
            data={measurements.data}
            canVoid={canMeasure}
            onChanged={() => setTick((current) => current + 1)}
          />
        ) : (
          <BoqDetailSkeleton />
        )}
      </section>
    </div>
  );
}
