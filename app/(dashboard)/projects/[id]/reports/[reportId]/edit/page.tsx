import { EditDailyReportScreen } from "@/components/daily-reports/daily-report-form-screens";
import type { Metadata } from "next";

type EditReportPageProps = {
  params: Promise<{ id: string; reportId: string }>;
};

export const metadata: Metadata = {
  title: "Edit daily report",
};

export default async function EditDailyReportPage({
  params,
}: EditReportPageProps) {
  const { id, reportId } = await params;
  return <EditDailyReportScreen projectId={id} reportId={reportId} />;
}
