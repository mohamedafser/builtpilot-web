import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MANPOWER_ROLE_LABELS,
  weatherLabel,
} from "@/constants/client-portal";
import type { ClientPortalReportDetail } from "@/lib/client-portal/types";
import { formatDate } from "@/lib/utils";

function Note({
  title,
  value,
}: {
  title: string;
  value: string | null | undefined;
}) {
  return (
    <section>
      <h3 className="text-sm font-medium text-stone-500">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-800">
        {value?.trim() ? value : "—"}
      </p>
    </section>
  );
}

export function ClientPortalReportDetailView({
  detail,
}: {
  detail: ClientPortalReportDetail;
}) {
  const manpower = detail.manpower.filter((row) => row.worker_count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formatDate(detail.report.report_date)}</CardTitle>
        <p className="mt-1 text-sm text-stone-500">
          Weather: {weatherLabel(detail.report.weather)}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <Note title="Work completed" value={detail.report.work_completed} />
        <Note title="Issues" value={detail.report.issues} />
        <Note title="Tomorrow's plan" value={detail.report.tomorrow_plan} />
        <Note title="Notes" value={detail.report.general_notes} />
        {manpower.length > 0 ? (
          <section>
            <h3 className="text-sm font-medium text-stone-500">People on site</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {manpower.map((row) => (
                <li
                  key={row.role}
                  className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-800"
                >
                  {MANPOWER_ROLE_LABELS[row.role]} · {row.worker_count}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
