import { EditVendorScreen } from "@/components/vendors/vendor-edit-screen";
import type { Metadata } from "next";

type EditVendorPageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Edit vendor" };

export default async function EditVendorPage({ params }: EditVendorPageProps) {
  const { id } = await params;
  return <EditVendorScreen id={id} />;
}
