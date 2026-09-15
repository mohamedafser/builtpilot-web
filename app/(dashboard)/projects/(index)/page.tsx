import { ProjectListSkeleton } from "@/components/projects/project-list-skeleton";
import { ProjectListScreen } from "@/components/projects/project-list-screen";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Projects",
};

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectListSkeleton />}>
      <ProjectListScreen />
    </Suspense>
  );
}
