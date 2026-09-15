import { VendorForm } from "@/components/vendors/vendor-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/workspace";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New vendor" };

export default async function NewVendorPage() {
  const { business } = await getWorkspaceContext();

  if (!business) {
    return (
      <Alert variant="error">
        A business workspace is required before you can add a vendor.
      </Alert>
    );
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Vendors", href: "/vendors" },
          { label: "New vendor" },
        ]}
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Vendor details</CardTitle>
          <p className="mt-1 text-sm text-stone-500">
            This vendor will be saved to {business.name}. The business is
            assigned on the server from your membership.
          </p>
        </CardHeader>
        <CardContent>
          <VendorForm />
        </CardContent>
      </Card>
    </>
  );
}
