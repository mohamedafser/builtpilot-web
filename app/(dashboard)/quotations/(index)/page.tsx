import { QuotationListScreen } from "@/components/quotations/quotation-list-screen";
import { QuotationListSkeleton } from "@/components/quotations/quotation-skeletons";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Quotations",
};

export default function QuotationsPage() {
  return (
    <Suspense fallback={<QuotationListSkeleton />}>
      <QuotationListScreen />
    </Suspense>
  );
}
