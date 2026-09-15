import { QuotationStatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import type { PaginationMeta } from "@/lib/api/pagination";
import { formatLabourCost } from "@/lib/labour/money";
import type { QuotationListItem } from "@/lib/quotations/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export function QuotationList({
  quotations,
  pagination,
}: {
  quotations: QuotationListItem[];
  pagination: PaginationMeta;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="hidden md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Valid until</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((quotation) => (
              <tr key={quotation.id} className="border-t border-stone-100">
                <td className="px-4 py-3 font-medium text-stone-900">
                  <Link
                    href={`/quotations/${quotation.id}`}
                    className="hover:text-amber-700"
                  >
                    {quotation.quotation_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/quotations/${quotation.id}`}
                    className="font-medium text-stone-900 hover:text-amber-700"
                  >
                    {quotation.title}
                  </Link>
                  {quotation.project_name ? (
                    <p className="mt-0.5 text-xs text-stone-500">
                      {quotation.project_name}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {quotation.client_name}
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {formatDate(quotation.quotation_date)}
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {formatDate(quotation.valid_until)}
                </td>
                <td className="px-4 py-3 font-medium text-stone-900">
                  {formatLabourCost(quotation.total_amount)}
                </td>
                <td className="px-4 py-3">
                  <QuotationStatusBadge status={quotation.effective_status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {quotations.map((quotation) => (
          <article
            key={quotation.id}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/quotations/${quotation.id}`}
                  className="font-semibold text-stone-900"
                >
                  {quotation.quotation_number}
                </Link>
                <p className="mt-1 text-sm font-medium text-stone-800">
                  {quotation.title}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  {quotation.client_name}
                </p>
              </div>
              <p className="text-base font-semibold text-stone-900">
                {formatLabourCost(quotation.total_amount)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <QuotationStatusBadge status={quotation.effective_status} />
              <span className="text-sm text-stone-500">
                {formatDate(quotation.quotation_date)}
              </span>
            </div>
            <p className="mt-2 text-sm text-stone-500">
              Valid until {formatDate(quotation.valid_until)}
            </p>
          </article>
        ))}
      </div>

      <Pagination {...pagination} />
    </div>
  );
}
