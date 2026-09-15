import { WorkerForm } from "@/components/workers/worker-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New worker",
};

export default async function NewWorkerPage() {
  const { business } = await getWorkspaceContext();

  if (!business) {
    return (
      <Alert variant="error">
        A business workspace is required before you can add a worker.
      </Alert>
    );
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Workers", href: "/workers" },
          { label: "New worker" },
        ]}
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Worker details</CardTitle>
          <p className="mt-1 text-sm text-stone-500">
            This worker will be saved to {business.name}. The business is
            assigned on the server from your membership.
          </p>
        </CardHeader>
        <CardContent>
          <WorkerForm />
        </CardContent>
      </Card>
    </>
  );
}
