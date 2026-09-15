import { DailyReportListScreen } from "@/components/daily-reports/daily-report-list-screen";
import { DailyReportListSkeleton } from "@/components/daily-reports/daily-report-skeletons";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";
import { Suspense } from "react";

type ReportsPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ReportsPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.project) {
    return { title: "Daily reports" };
  }

  return { title: `Daily reports · ${result.project.name}` };
}

export default async function DailyReportsPage({ params }: ReportsPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<DailyReportListSkeleton />}>
      <DailyReportListScreen projectId={id} />
    </Suspense>
  );
}
