import { QuotationListScreen } from "@/components/quotations/quotation-list-screen";
import { QuotationListSkeleton } from "@/components/quotations/quotation-skeletons";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";
import { Suspense } from "react";

type ProjectQuotationsPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProjectQuotationsPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.project) {
    return { title: "Quotations" };
  }

  return { title: `Quotations · ${result.project.name}` };
}

export default async function ProjectQuotationsPage({
  params,
}: ProjectQuotationsPageProps) {
  const { id } = await params;
  const result = await getProjectById(id);

  return (
    <Suspense fallback={<QuotationListSkeleton />}>
      <QuotationListScreen
        projectId={id}
        projectName={result.project?.name}
      />
    </Suspense>
  );
}
