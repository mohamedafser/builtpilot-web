"use client";

import { BoqCreateForm } from "@/components/boq/boq-create-form";
import { BoqBuilder } from "@/components/boq/boq-builder";
import {
  BoqDetailSkeleton,
  BoqFormSkeleton,
} from "@/components/boq/boq-skeletons";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WithIcon } from "@/components/ui/with-icon";
import { useApiData } from "@/hooks/use-api-data";
import { useProject } from "@/hooks/use-project";
import { boqActions } from "@/lib/boq/calculations";
import type { BoqDetail } from "@/lib/boq/types";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function NewBoqScreen({ projectId }: { projectId: string }) {
  const { project, error, notFound, isLoading } = useProject(projectId);

  if (isLoading) {
    return <BoqFormSkeleton />;
  }

  if (notFound) {
    return (
      <EmptyState
        title="Project not found"
        description="This project does not exist or you do not have access to it."
        action={
          <Link
            href="/projects"
            className={cn(linkButtonClassName("secondary"))}
          >
            Back to projects
          </Link>
        }
      />
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-lg font-semibold text-stone-900">
          Create BOQ estimate
        </h2>
        <p className="mt-1 mb-5 text-sm text-stone-500">
          {project
            ? `Build the estimate for ${project.name} by adding work sections, quantities, and rates.`
            : "Build the estimate by adding work sections, quantities, and rates."}
        </p>
        <BoqCreateForm projectId={projectId} />
      </CardContent>
    </Card>
  );
}

export function EditBoqScreen({
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

  if (!boqActions(data.boq.status).edit) {
    return (
      <Alert variant="error">
        Only draft or active BOQs can be edited. Duplicate this BOQ to make a
        new version.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">
            Edit BOQ estimate
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Add or update sections and items. Estimated cost is calculated as
            quantity × rate.
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/boq/${boqId}`}
          className={cn(linkButtonClassName("secondary", "sm"))}
        >
          <WithIcon icon={ArrowLeft}>Back</WithIcon>
        </Link>
      </div>
      <BoqBuilder
        projectId={projectId}
        boq={data.boq}
        onChanged={() => setTick((current) => current + 1)}
      />
    </div>
  );
}
