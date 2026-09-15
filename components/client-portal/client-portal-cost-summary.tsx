import { ClientPortalEmptyState } from "@/components/client-portal/client-portal-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPortalMoney } from "@/lib/client-portal/helpers";
import type { ClientPortalCostSummary } from "@/lib/client-portal/types";

export function ClientPortalCostSummaryView({
  cost,
  estimatedAmount,
}: {
  cost: ClientPortalCostSummary | null;
  estimatedAmount?: string | null;
}) {
  if (!cost) {
    return (
      <ClientPortalEmptyState
        title="Project cost details are not available."
        description="A simplified cost summary will appear here if your contractor shares it."
      />
    );
  }

  const rows = [
    { label: "Labour cost", value: cost.labour_cost },
    { label: "Material cost", value: cost.material_cost },
    { label: "Other expenses", value: cost.other_expenses },
    { label: "Total actual cost", value: cost.total_cost },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project cost</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 border-b border-stone-100 py-2 last:border-b-0"
            >
              <dt className="text-sm text-stone-500">{row.label}</dt>
              <dd className="text-base font-semibold text-stone-900">
                {formatPortalMoney(row.value)}
              </dd>
            </div>
          ))}
        </dl>
        {estimatedAmount ? (
          <div className="rounded-lg bg-stone-50 p-4">
            <p className="text-sm font-medium text-stone-800">
              Estimated vs Actual
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-stone-500">Estimated</dt>
                <dd className="mt-1 font-semibold text-stone-900">
                  {formatPortalMoney(estimatedAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Actual</dt>
                <dd className="mt-1 font-semibold text-stone-900">
                  {formatPortalMoney(cost.total_cost)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
