import { PermissionGuard } from "@/components/permissions/permission-guard";
import { ProjectForm } from "@/components/projects/project-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New project",
};

export default async function NewProjectPage() {
  const { business } = await getWorkspaceContext();

  if (!business) {
    return (
      <Alert variant="error">
        A business workspace is required before you can create a project.
      </Alert>
    );
  }

  return (
    <PermissionGuard permission="projects.create">
      <Breadcrumbs
        items={[
          { label: "Projects", href: "/projects" },
          { label: "New project" },
        ]}
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Project details</CardTitle>
          <p className="mt-1 text-sm text-stone-500">
            This job will be saved to {business.name}. The business is assigned
            on the server from your membership.
          </p>
        </CardHeader>
        <CardContent>
          <ProjectForm />
        </CardContent>
      </Card>
    </PermissionGuard>
  );
}
