import { QuotationEstimateScreen } from "@/components/quotation-templates/estimate-screen";
import { getProjectById } from "@/lib/projects/queries";
import { getWorkspaceContext } from "@/lib/workspace";
import type { Metadata } from "next";
import { Suspense } from "react";

type NewProjectQuotationPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export async function generateMetadata({
  params,
}: NewProjectQuotationPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.project) {
    return { title: "New quotation" };
  }

  return { title: `New quotation · ${result.project.name}` };
}

export default async function NewProjectQuotationPage({
  params,
  searchParams,
}: NewProjectQuotationPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const blankMode = query.mode === "blank";
  const { business } = await getWorkspaceContext();

  return (
    <Suspense fallback={null}>
      <QuotationEstimateScreen
        projectId={id}
        defaultCountryCode={business?.country_code}
        mode={blankMode ? "blank" : "template"}
      />
    </Suspense>
  );
}
