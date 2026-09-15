import { ClientPortalEmptyState } from "@/components/client-portal/client-portal-empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { BOQ_UNIT_SHORT_LABELS } from "@/constants/boq";
import { formatPortalQuantity } from "@/lib/client-portal/helpers";
import type { ClientPortalMeasurement } from "@/lib/client-portal/types";
import { formatDateLong } from "@/lib/utils";

export function ClientPortalMeasurements({
  measurements,
}: {
  measurements: ClientPortalMeasurement[];
}) {
  if (measurements.length === 0) {
    return (
      <ClientPortalEmptyState
        title="No measurements have been recorded yet."
        description="Completed work measurements will appear here."
      />
    );
  }

  const groups = new Map<string, ClientPortalMeasurement[]>();
  for (const measurement of measurements) {
    const current = groups.get(measurement.measurement_date) ?? [];
    current.push(measurement);
    groups.set(measurement.measurement_date, current);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([date, items]) => (
        <section key={date} className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">
            {formatDateLong(date)}
          </h2>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="space-y-1 p-4">
                    <p className="font-medium text-stone-900">
                      {item.item_description}
                    </p>
                    <p className="text-sm text-stone-700">
                      {formatPortalQuantity(item.quantity)}{" "}
                      {BOQ_UNIT_SHORT_LABELS[item.unit]}
                    </p>
                    {item.location ? (
                      <p className="text-sm text-stone-500">{item.location}</p>
                    ) : null}
                    {item.description ? (
                      <p className="text-sm text-stone-600">{item.description}</p>
                    ) : null}
                    {item.reference ? (
                      <p className="text-xs text-stone-500">
                        Ref: {item.reference}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
