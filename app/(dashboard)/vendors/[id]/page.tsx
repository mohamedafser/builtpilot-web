import { VendorDetailScreen } from "@/components/vendors/vendor-detail-screen";
import { getVendorById } from "@/lib/vendors/queries";
import type { Metadata } from "next";

type VendorPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: VendorPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getVendorById(id);
  if (!result.vendor) return { title: "Vendor" };
  return { title: result.vendor.name };
}

export default async function VendorDetailPage({ params }: VendorPageProps) {
  const { id } = await params;
  return <VendorDetailScreen id={id} />;
}
