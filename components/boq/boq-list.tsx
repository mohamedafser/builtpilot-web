import { BoqStatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { formatCompletionPercent } from "@/lib/boq/calculations";
import type { BoqListItem } from "@/lib/boq/types";
import { formatLabourCost } from "@/lib/labour/money";
import type { PaginationMeta } from "@/lib/api/pagination";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export function BoqList({
  projectId,
  boqs,
  pagination,
}: {
  projectId: string;
  boqs: BoqListItem[];
  pagination: PaginationMeta;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="hidden md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Estimated</th>
              <th className="px-4 py-3 font-medium">Completion</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {boqs.map((boq) => (
              <tr key={boq.id} className="border-t border-stone-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${projectId}/boq/${boq.id}`}
                    className="font-medium text-stone-900 hover:text-amber-700"
                  >
                    {boq.name}
                  </Link>
                  {boq.description ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">
                      {boq.description}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <BoqStatusBadge status={boq.status} />
                </td>
                <td className="px-4 py-3 font-medium text-stone-900">
                  {formatLabourCost(boq.summary.estimated_value)}
                </td>
                <td className="px-4 py-3 text-stone-700">
                  {formatCompletionPercent(boq.summary.completion_percentage)}
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {formatDate(boq.created_at.slice(0, 10))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {boqs.map((boq) => (
          <article
            key={boq.id}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/projects/${projectId}/boq/${boq.id}`}
                className="font-semibold text-stone-900"
              >
                {boq.name}
              </Link>
              <BoqStatusBadge status={boq.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-stone-500">Estimated</dt>
                <dd className="mt-0.5 font-semibold text-stone-900">
                  {formatLabourCost(boq.summary.estimated_value)}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Completion</dt>
                <dd className="mt-0.5 font-semibold text-stone-900">
                  {formatCompletionPercent(boq.summary.completion_percentage)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-sm text-stone-500">
              Created {formatDate(boq.created_at.slice(0, 10))}
            </p>
          </article>
        ))}
      </div>

      <Pagination {...pagination} />
    </div>
  );
}
