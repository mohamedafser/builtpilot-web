import { ClientPortalEmptyState } from "@/components/client-portal/client-portal-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPortalMoney, formatPortalQuantity } from "@/lib/client-portal/helpers";
import type { ClientPortalQuotation } from "@/lib/client-portal/types";
import { formatDate } from "@/lib/utils";

export function ClientPortalQuotationView({
  quotation,
}: {
  quotation: ClientPortalQuotation | null;
}) {
  if (!quotation) {
    return (
      <ClientPortalEmptyState
        title="No quotation has been shared."
        description="Your contractor can share the accepted quotation here."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{quotation.quotation_number}</CardTitle>
        <p className="mt-1 text-sm text-stone-500">{quotation.title}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-stone-500">Date</dt>
            <dd className="mt-1 font-medium text-stone-800">
              {formatDate(quotation.quotation_date)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-stone-500">Valid until</dt>
            <dd className="mt-1 font-medium text-stone-800">
              {formatDate(quotation.valid_until)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-stone-500">Prepared for</dt>
            <dd className="mt-1 font-medium text-stone-800">
              {quotation.client_name}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-stone-500">Contact</dt>
            <dd className="mt-1 font-medium text-stone-800">
              {quotation.client_phone || quotation.client_email || "—"}
            </dd>
          </div>
        </dl>
        {quotation.client_address ? (
          <p className="text-sm text-stone-600">{quotation.client_address}</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs tracking-wide text-stone-500 uppercase">
              <tr>
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 font-medium">Qty</th>
                <th className="py-2 pr-3 font-medium">Unit</th>
                <th className="py-2 pr-3 font-medium">Rate</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item) => (
                <tr key={item.id} className="border-t border-stone-100">
                  <td className="py-3 pr-3">{item.description}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {formatPortalQuantity(item.quantity)}
                  </td>
                  <td className="py-3 pr-3">{item.unit}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {formatPortalMoney(item.unit_price)}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap font-medium">
                    {formatPortalMoney(item.total_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Subtotal</dt>
            <dd>{formatPortalMoney(quotation.subtotal)}</dd>
          </div>
          {Number(quotation.discount_amount) > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Discount</dt>
              <dd>-{formatPortalMoney(quotation.discount_amount)}</dd>
            </div>
          ) : null}
          {Number(quotation.tax_amount) > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">
                Tax
                {quotation.tax_percentage ? ` (${quotation.tax_percentage}%)` : ""}
              </dt>
              <dd>{formatPortalMoney(quotation.tax_amount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-stone-200 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatPortalMoney(quotation.total_amount)}</dd>
          </div>
        </dl>
        {quotation.notes ? (
          <section>
            <h3 className="text-sm font-medium text-stone-500">Notes</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
              {quotation.notes}
            </p>
          </section>
        ) : null}
        {quotation.terms ? (
          <section>
            <h3 className="text-sm font-medium text-stone-500">Terms</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
              {quotation.terms}
            </p>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
