import { QuotationEstimateScreen } from "@/components/quotation-templates/estimate-screen";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Alert } from "@/components/ui/alert";
import { getWorkspaceContext } from "@/lib/workspace";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "New quotation",
};

type NewQuotationPageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function NewQuotationPage({
  searchParams,
}: NewQuotationPageProps) {
  const { business } = await getWorkspaceContext();
  const params = await searchParams;
  const blankMode = params.mode === "blank";

  if (!business) {
    return (
      <Alert variant="error">
        A business workspace is required before you can create a quotation.
      </Alert>
    );
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Quotations", href: "/quotations" },
          { label: blankMode ? "Blank quotation" : "New quotation" },
        ]}
      />
      <Suspense fallback={null}>
        <QuotationEstimateScreen
          defaultCountryCode={business.country_code}
          mode={blankMode ? "blank" : "template"}
        />
      </Suspense>
    </>
  );
}
