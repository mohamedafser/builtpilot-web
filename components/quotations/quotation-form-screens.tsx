"use client";

import { QuotationForm } from "@/components/quotations/quotation-form";
import { QuotationFormSkeleton } from "@/components/quotations/quotation-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WithIcon } from "@/components/ui/with-icon";
import { useApiData } from "@/hooks/use-api-data";
import { useProject } from "@/hooks/use-project";
import type { QuotationDetail } from "@/lib/quotations/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

function BlankQuotationChrome({
  projectId,
  children,
}: {
  projectId?: string;
  children: React.ReactNode;
}) {
  const templateHref = projectId
    ? `/projects/${projectId}/quotations/new`
    : "/quotations/new";
  const backHref = projectId
    ? `/projects/${projectId}/quotations`
    : "/quotations";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Blank quotation
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Add materials, labour, and custom line items manually, then save as
            a draft.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={templateHref}
            className={cn(linkButtonClassName("secondary", "sm"))}
          >
            <WithIcon icon={Sparkles}>Default template</WithIcon>
          </Link>
          <Link
            href={backHref}
            className={cn(linkButtonClassName("secondary", "sm"))}
          >
            <WithIcon icon={ArrowLeft}>Back</WithIcon>
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}

function NewProjectQuotationScreen({ projectId }: { projectId: string }) {
  const { project, error, notFound, isLoading } = useProject(projectId);

  if (isLoading) {
    return <QuotationFormSkeleton />;
  }

  if (notFound) {
    return (
      <EmptyState
        title="Project not found"
        description="This project does not exist or you do not have access to it."
        action={
          <Link href="/projects" className={cn(linkButtonClassName("secondary"))}>
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
    <BlankQuotationChrome projectId={projectId}>
      <QuotationForm
        lockedProjectId={projectId}
        defaultProject={project ?? undefined}
      />
    </BlankQuotationChrome>
  );
}

export function NewQuotationScreen({ projectId }: { projectId?: string }) {
  if (projectId) {
    return <NewProjectQuotationScreen projectId={projectId} />;
  }

  return (
    <BlankQuotationChrome>
      <QuotationForm />
    </BlankQuotationChrome>
  );
}

export function EditQuotationScreen({ quotationId }: { quotationId: string }) {
  const { data, error, isLoading } = useApiData<{ quotation: QuotationDetail }>(
    `/api/quotations/${quotationId}`,
  );

  if (isLoading) {
    return <QuotationFormSkeleton />;
  }

  if (error === "Quotation not found.") {
    return (
      <EmptyState
        title="Quotation not found"
        description="This quotation does not exist or you do not have access to it."
        action={
          <Link href="/quotations" className={cn(linkButtonClassName("secondary"))}>
            Back to quotations
          </Link>
        }
      />
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!data?.quotation) {
    return null;
  }

  if (data.quotation.status !== "draft") {
    return (
      <Alert variant="error">
        Only draft quotations can be edited. Duplicate this quotation to make a
        new version.
      </Alert>
    );
  }

  const backHref = data.quotation.project_id
    ? `/projects/${data.quotation.project_id}/quotations`
    : "/quotations";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Edit quotation
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Update items and totals. The quotation number stays the same.
          </p>
        </div>
        <Link
          href={backHref}
          className={cn(linkButtonClassName("secondary", "sm"))}
        >
          <WithIcon icon={ArrowLeft}>Back</WithIcon>
        </Link>
      </div>
      <QuotationForm
        quotation={data.quotation}
        lockedProjectId={data.quotation.project_id ?? undefined}
      />
    </div>
  );
}
