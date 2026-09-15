import { redirect } from "next/navigation";

/** Kept for old links — default template now lives on New quotation. */
export default function QuotationEstimateRedirectPage() {
  redirect("/quotations/new");
}
