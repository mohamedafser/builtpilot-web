import { MaterialForm } from "@/components/materials/material-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New material",
};

export default async function NewMaterialPage() {
  const { business } = await getWorkspaceContext();

  if (!business) {
    return (
      <Alert variant="error">
        A business workspace is required before you can add a material.
      </Alert>
    );
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Materials", href: "/materials" },
          { label: "New material" },
        ]}
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Material details</CardTitle>
          <p className="mt-1 text-sm text-stone-500">
            This material will be saved to {business.name}. The business is
            assigned on the server from your membership.
          </p>
        </CardHeader>
        <CardContent>
          <MaterialForm />
        </CardContent>
      </Card>
    </>
  );
}
