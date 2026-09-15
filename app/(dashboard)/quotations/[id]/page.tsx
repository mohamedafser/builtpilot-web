import { QuotationDetailScreen } from "@/components/quotations/quotation-detail-screen";
import { getQuotationById } from "@/lib/quotations/queries";
import type { Metadata } from "next";

type QuotationPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: QuotationPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getQuotationById(id);

  if (!result.quotation) {
    return { title: "Quotation" };
  }

  return { title: result.quotation.quotation_number };
}

export default async function QuotationDetailPage({ params }: QuotationPageProps) {
  const { id } = await params;
  return <QuotationDetailScreen quotationId={id} />;
}
