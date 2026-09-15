import { EditQuotationScreen } from "@/components/quotations/quotation-form-screens";
import type { Metadata } from "next";

type EditQuotationPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Edit quotation",
};

export default async function EditQuotationPage({
  params,
}: EditQuotationPageProps) {
  const { id } = await params;
  return <EditQuotationScreen quotationId={id} />;
}
