import { ClientPortalEmptyState } from "@/components/client-portal/client-portal-empty-state";
import { ClientPortalProgress } from "@/components/client-portal/client-portal-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BOQ_UNIT_SHORT_LABELS } from "@/constants/boq";
import { formatCompletionPercent } from "@/lib/boq/calculations";
import {
  formatPortalMoney,
  formatPortalQuantity,
} from "@/lib/client-portal/helpers";
import type { ClientPortalBOQ } from "@/lib/client-portal/types";

export function ClientPortalBOQView({ boq }: { boq: ClientPortalBOQ | null }) {
  if (!boq) {
    return (
      <ClientPortalEmptyState
        title="Work progress has not been added yet."
        description="Your contractor will share work items and progress here."
      />
    );
  }

  const sections = new Map<string, string>();
  for (const item of boq.items) {
    if (item.section_id && item.section_name) {
      sections.set(item.section_id, item.section_name);
    }
  }

  const unsectioned = boq.items.filter((item) => !item.section_id);
  const sectionIds = [...sections.keys()];

  return (
    <div className="space-y-5">
      <ClientPortalProgress summary={boq.summary} />
      <Card>
        <CardHeader>
          <CardTitle>{boq.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {sectionIds.map((sectionId) => {
            const items = boq.items.filter((item) => item.section_id === sectionId);
            return (
              <section key={sectionId}>
                <h3 className="mb-3 text-sm font-semibold text-stone-800">
                  {sections.get(sectionId)}
                </h3>
                <BoqItemList items={items} />
              </section>
            );
          })}
          {unsectioned.length > 0 ? (
            <section>
              {sectionIds.length > 0 ? (
                <h3 className="mb-3 text-sm font-semibold text-stone-800">
                  Other work
                </h3>
              ) : null}
              <BoqItemList items={unsectioned} />
            </section>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function BoqItemList({
  items,
}: {
  items: ClientPortalBOQ["items"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs tracking-wide text-stone-500 uppercase">
          <tr>
            <th className="py-2 pr-3 font-medium">Item</th>
            <th className="py-2 pr-3 font-medium">Estimated</th>
            <th className="py-2 pr-3 font-medium">Completed</th>
            <th className="py-2 pr-3 font-medium">Remaining work</th>
            <th className="py-2 pr-3 font-medium">Rate</th>
            <th className="py-2 pr-3 font-medium">Progress</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-stone-100 align-top">
              <td className="py-3 pr-3">
                <p className="font-medium text-stone-900">{item.description}</p>
                <p className="text-xs text-stone-500">
                  {item.item_code ? `${item.item_code} · ` : ""}
                  {BOQ_UNIT_SHORT_LABELS[item.unit]}
                </p>
              </td>
              <td className="py-3 pr-3 whitespace-nowrap">
                {formatPortalQuantity(item.estimated_quantity)}
                <div className="text-xs text-stone-500">
                  {formatPortalMoney(item.estimated_amount)}
                </div>
              </td>
              <td className="py-3 pr-3 whitespace-nowrap">
                {formatPortalQuantity(item.completed_quantity)}
                <div className="text-xs text-stone-500">
                  {formatPortalMoney(item.completed_value)}
                </div>
              </td>
              <td className="py-3 pr-3 whitespace-nowrap">
                {formatPortalQuantity(item.remaining_quantity)}
                <div className="text-xs text-stone-500">
                  {formatPortalMoney(item.remaining_value)}
                </div>
              </td>
              <td className="py-3 pr-3 whitespace-nowrap">
                {formatPortalMoney(item.rate)}
              </td>
              <td className="py-3 pr-3 whitespace-nowrap font-medium">
                {formatCompletionPercent(item.completion_percentage)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
