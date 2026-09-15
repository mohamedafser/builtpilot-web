import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

/** Kept for old links — default template now lives on New quotation. */
export default async function ProjectQuotationEstimateRedirectPage({
  params,
}: Props) {
  const { id } = await params;
  redirect(`/projects/${id}/quotations/new`);
}
