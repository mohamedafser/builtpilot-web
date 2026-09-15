import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompletionPercent } from "@/lib/boq/calculations";
import { formatPortalMoney } from "@/lib/client-portal/helpers";
import type { BoqSummary } from "@/lib/boq/types";

export function ClientPortalProgress({ summary }: { summary: BoqSummary }) {
  const percent = summary.completion_percentage;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-stone-500">Overall progress</p>
          <p className="mt-1 text-3xl font-semibold text-stone-900">
            {formatCompletionPercent(percent)}
          </p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-amber-600"
              style={{ width: `${Math.min(100, Math.max(0, percent ?? 0))}%` }}
            />
          </div>
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-stone-500">Estimated value</dt>
            <dd className="mt-1 text-lg font-semibold text-stone-900">
              {formatPortalMoney(summary.estimated_value)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-stone-500">Completed value</dt>
            <dd className="mt-1 text-lg font-semibold text-stone-900">
              {formatPortalMoney(summary.completed_value)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-stone-500">Remaining value</dt>
            <dd className="mt-1 text-lg font-semibold text-stone-900">
              {formatPortalMoney(summary.remaining_value)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
