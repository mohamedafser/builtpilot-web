import { Card, CardContent } from "@/components/ui/card";
import { weatherLabel } from "@/constants/client-portal";
import { workPreview } from "@/lib/daily-reports/display";
import type { ClientPortalReport } from "@/lib/client-portal/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export function ClientPortalReportCard({
  report,
  href,
  showPhotoCount = false,
}: {
  report: ClientPortalReport;
  href: string;
  showPhotoCount?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:border-stone-300">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-stone-900">
              {formatDate(report.report_date)}
            </p>
            <p className="text-xs font-medium text-stone-500">
              {weatherLabel(report.weather)}
            </p>
          </div>
          <p className="text-sm leading-6 text-stone-700">
            {workPreview(report.work_completed) || "Site update"}
          </p>
          <p className="text-xs text-stone-500">
            {report.worker_count > 0 ? `${report.worker_count} people on site` : "No manpower noted"}
            {showPhotoCount && report.photo_count > 0
              ? ` · ${report.photo_count} photos`
              : ""}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
