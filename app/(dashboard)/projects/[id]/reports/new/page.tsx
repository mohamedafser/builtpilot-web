import { NewDailyReportScreen } from "@/components/daily-reports/daily-report-form-screens";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";

type NewReportPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewReportPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.project) {
    return { title: "New daily report" };
  }

  return { title: `New daily report · ${result.project.name}` };
}

export default async function NewDailyReportPage({
  params,
}: NewReportPageProps) {
  const { id } = await params;
  return <NewDailyReportScreen projectId={id} />;
}
