"use client";

import { BoqActions } from "@/components/boq/boq-actions";
import { BoqItemCard } from "@/components/boq/boq-item-card";
import { BoqSummaryCards } from "@/components/boq/boq-summary-cards";
import { BoqStatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  BOQ_COMPLETION_STATUS_LABELS,
  BOQ_COMPLETION_STATUSES,
  BOQ_ITEM_TYPE_LABELS,
  BOQ_ITEM_TYPES,
} from "@/constants/boq";
import {
  formatCompletionPercent,
  matchesItemFilters,
} from "@/lib/boq/calculations";
import type { BoqDetail } from "@/lib/boq/types";
import { formatLabourCost } from "@/lib/labour/money";
import { formatDate } from "@/lib/utils";
import { useMemo, useState } from "react";

export function BoqDetailView({
  projectId,
  boq,
  onUpdated,
}: {
  projectId: string;
  boq: BoqDetail;
  onUpdated?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sectionId, setSectionId] = useState("all");
  const [itemType, setItemType] = useState("all");
  const [completion, setCompletion] = useState("all");
  const items = useMemo(
    () =>
      [...boq.items, ...boq.unsectioned_items]
        .sort((left, right) => left.sort_order - right.sort_order)
        .filter((item) =>
          matchesItemFilters(item, {
            query,
            sectionId: sectionId === "all" ? undefined : sectionId,
            itemType,
            completion,
          }),
        ),
    [boq.items, boq.unsectioned_items, completion, itemType, query, sectionId],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-stone-900">
                {boq.name}
              </h2>
              <BoqStatusBadge status={boq.status} />
            </div>
            {boq.description ? (
              <p className="mt-2 text-sm text-stone-600">{boq.description}</p>
            ) : null}
            <p className="mt-2 text-sm text-stone-500">
              Created {formatDate(boq.created_at.slice(0, 10))}
              {boq.created_by_name ? ` by ${boq.created_by_name}` : ""}
            </p>
          </div>
          <BoqActions
            projectId={projectId}
            boq={boq}
            layout="stack"
            onUpdated={onUpdated}
          />
        </div>
      </section>

      <BoqSummaryCards summary={boq.summary} />

      {boq.estimate_vs_actual ? (
        <dl className="grid gap-3 sm:grid-cols-3">
          {boq.estimate_vs_actual.quotation_value ? (
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <dt className="text-sm text-stone-500">Quotation</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">
                {formatLabourCost(boq.estimate_vs_actual.quotation_value)}
              </dd>
            </div>
          ) : null}
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <dt className="text-sm text-stone-500">BOQ estimate</dt>
            <dd className="mt-1 text-lg font-semibold text-stone-900">
              {formatLabourCost(boq.estimate_vs_actual.boq_estimated_value)}
            </dd>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <dt className="text-sm text-stone-500">Actual cost</dt>
            <dd className="mt-1 text-lg font-semibold text-stone-900">
              {formatLabourCost(boq.estimate_vs_actual.actual_cost)}
            </dd>
            <p className="mt-1 text-xs text-stone-500">
              Labour + materials + expenses. Difference{" "}
              {formatLabourCost(boq.estimate_vs_actual.difference)}.
            </p>
          </div>
        </dl>
      ) : null}

      {boq.sections.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-stone-900">
            Section estimate progress
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {boq.sections.map((section) => (
              <article
                key={section.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-semibold text-stone-900">
                    {section.name}
                  </h4>
                  <p className="text-sm font-semibold text-stone-900">
                    {formatCompletionPercent(section.completion_percentage)}
                  </p>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-stone-500">Estimated</dt>
                    <dd className="mt-0.5 font-medium text-stone-800">
                      {formatLabourCost(section.estimated_value)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Completed</dt>
                    <dd className="mt-0.5 font-medium text-stone-800">
                      {formatLabourCost(section.completed_value)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Remaining</dt>
                    <dd className="mt-0.5 font-medium text-stone-800">
                      {formatLabourCost(section.remaining_value)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-stone-900">BOQ items</h3>
        <div className="grid gap-3 lg:grid-cols-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search item code, description, or section"
            className="h-12 text-base lg:col-span-1 lg:h-10 lg:text-sm"
          />
          <Select
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            className="h-12 text-base lg:h-10 lg:text-sm"
            aria-label="Filter by section"
          >
            <option value="all">All sections</option>
            {boq.sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </Select>
          <Select
            value={itemType}
            onChange={(event) => setItemType(event.target.value)}
            className="h-12 text-base lg:h-10 lg:text-sm"
            aria-label="Filter by item type"
          >
            <option value="all">All types</option>
            {BOQ_ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {BOQ_ITEM_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
          <Select
            value={completion}
            onChange={(event) => setCompletion(event.target.value)}
            className="h-12 text-base lg:h-10 lg:text-sm"
            aria-label="Filter by completion"
          >
            <option value="all">All progress</option>
            {BOQ_COMPLETION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {BOQ_COMPLETION_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </div>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-sm text-stone-500">
            No matching items.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <BoqItemCard
                key={item.id}
                projectId={projectId}
                boqId={boq.id}
                item={item}
                showMeasure={boq.status === "draft" || boq.status === "active"}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
