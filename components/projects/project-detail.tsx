"use client";

import { ProjectClientPortalCard } from "@/components/client-portal/project-client-portal-card";
import { ProjectDashboard } from "@/components/projects/project-dashboard";
import { ProjectNextSteps } from "@/components/projects/project-next-steps";
import { ProjectQuotationSummary } from "@/components/quotations/project-quotation-summary";
import type { Project } from "@/types";

export function ProjectDetail({ project }: { project: Project }) {
  return (
    <div className="space-y-4">
      <ProjectNextSteps projectId={project.id} />
      <ProjectDashboard project={project} />
      <ProjectQuotationSummary projectId={project.id} />
      <ProjectClientPortalCard projectId={project.id} />
    </div>
  );
}
