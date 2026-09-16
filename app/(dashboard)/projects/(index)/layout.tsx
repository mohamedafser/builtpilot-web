import { ProjectFilters } from "@/components/projects/project-filters";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

export default async function ProjectsIndexLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { business, role } = await getWorkspaceContext();

  if (!business) {
    return (
      <Alert variant="error">
        No business workspace was found for this account.
      </Alert>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-stone-500">Jobs linked to {business.name}</p>
          {hasPermission(role, "projects.create") ? (
            <Link
              href="/projects/new"
              className={cn(linkButtonClassName("primary", "sm"))}
            >
              <WithIcon icon={Plus}>Create project</WithIcon>
            </Link>
          ) : null}
        </div>
        <Suspense fallback={<div className="h-9" />}>
          <ProjectFilters />
        </Suspense>
      </div>
      {children}
    </>
  );
}
