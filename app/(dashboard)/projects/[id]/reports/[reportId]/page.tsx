import { DailyReportDetailScreen } from "@/components/daily-reports/daily-report-detail-screen";
import { getDailyReport } from "@/lib/daily-reports/queries";
import type { Metadata } from "next";

type ReportDetailPageProps = {
  params: Promise<{ id: string; reportId: string }>;
};

export async function generateMetadata({
  params,
}: ReportDetailPageProps): Promise<Metadata> {
  const { id, reportId } = await params;
  const result = await getDailyReport(id, reportId);

  if (!result.detail) {
    return { title: "Daily report" };
  }

  return { title: `Daily report · ${result.detail.report.report_date}` };
}

export default async function DailyReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { id, reportId } = await params;
  return <DailyReportDetailScreen projectId={id} reportId={reportId} />;
}
