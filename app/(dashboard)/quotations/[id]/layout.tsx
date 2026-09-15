import { QuotationBreadcrumbs } from "@/components/quotations/quotation-breadcrumbs";
import { getQuotationById } from "@/lib/quotations/queries";
import type { ReactNode } from "react";

export default async function QuotationIdLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getQuotationById(id);

  return (
    <>
      <QuotationBreadcrumbs
        quotationId={id}
        quotationNumber={result.quotation?.quotation_number ?? "Quotation"}
      />
      {children}
    </>
  );
}
