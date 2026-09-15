"use client";

import { EstimateVsActualCard } from "@/components/quotations/estimate-vs-actual";
import { QuotationActions } from "@/components/quotations/quotation-actions";
import {
  QuotationItemTypeBadge,
  QuotationStatusBadge,
} from "@/components/ui/badge";
import { QUOTATION_ITEM_TYPE_LABELS } from "@/constants/quotation";
import { formatLabourCost } from "@/lib/labour/money";
import type { QuotationDetail } from "@/lib/quotations/types";
import { formatDateLong, formatTimestamp } from "@/lib/utils";
import Link from "next/link";

export function QuotationDetailView({
  quotation,
  onUpdated,
}: {
  quotation: QuotationDetail;
  onUpdated?: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="print:hidden rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-stone-900">
                {quotation.quotation_number}
              </h2>
              <QuotationStatusBadge status={quotation.effective_status} />
            </div>
            <p className="mt-2 text-lg font-medium text-stone-800">
              {quotation.title}
            </p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {formatLabourCost(quotation.total_amount)}
            </p>
            {quotation.project_id ? (
              <p className="mt-2 text-sm text-stone-500">
                Linked to{" "}
                <Link
                  href={`/projects/${quotation.project_id}`}
                  className="font-medium text-amber-700 hover:text-amber-800"
                >
                  {quotation.project_name || "project"}
                </Link>
              </p>
            ) : null}
            {quotation.rejection_reason ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                Rejected: {quotation.rejection_reason}
              </p>
            ) : null}
          </div>
          <QuotationActions
            quotation={quotation}
            layout="stack"
            onUpdated={onUpdated}
          />
        </div>
      </section>

      <article className="mx-auto max-w-4xl rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-stone-400 uppercase">
              Quotation
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-stone-900">
              {quotation.business_name}
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              {quotation.quotation_number}
            </p>
          </div>
          <dl className="grid gap-2 text-sm sm:text-right">
            <div>
              <dt className="text-stone-500">Date</dt>
              <dd className="font-medium text-stone-800">
                {formatDateLong(quotation.quotation_date)}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Valid until</dt>
              <dd className="font-medium text-stone-800">
                {formatDateLong(quotation.valid_until)}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Status</dt>
              <dd className="mt-1">
                <QuotationStatusBadge status={quotation.effective_status} />
              </dd>
            </div>
          </dl>
        </header>

        <section className="grid gap-6 border-b border-stone-200 py-6 sm:grid-cols-2">
          <div>
            <h4 className="text-xs font-semibold tracking-[0.16em] text-stone-400 uppercase">
              Client
            </h4>
            <p className="mt-2 font-medium text-stone-900">
              {quotation.client_name}
            </p>
            {quotation.client_phone ? (
              <p className="mt-1 text-sm text-stone-600">
                {quotation.client_phone}
              </p>
            ) : null}
            {quotation.client_email ? (
              <p className="mt-1 text-sm text-stone-600">
                {quotation.client_email}
              </p>
            ) : null}
            {quotation.client_address ? (
              <p className="mt-2 text-sm whitespace-pre-wrap text-stone-600">
                {quotation.client_address}
              </p>
            ) : null}
          </div>
          <div>
            <h4 className="text-xs font-semibold tracking-[0.16em] text-stone-400 uppercase">
              Prepared for
            </h4>
            <p className="mt-2 text-sm text-stone-600">{quotation.title}</p>
          </div>
        </section>

        <section className="py-6">
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-stone-200 text-stone-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Description</th>
                  <th className="py-2 pr-3 font-medium">Qty</th>
                  <th className="py-2 pr-3 font-medium">Unit</th>
                  <th className="py-2 pr-3 font-medium">Rate</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, index) => (
                  <tr key={item.id} className="border-b border-stone-100">
                    <td className="py-3 pr-3 text-stone-500">{index + 1}</td>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-stone-900">
                        {item.description}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {QUOTATION_ITEM_TYPE_LABELS[item.item_type]}
                      </p>
                    </td>
                    <td className="py-3 pr-3 text-stone-700">{item.quantity}</td>
                    <td className="py-3 pr-3 text-stone-700">{item.unit}</td>
                    <td className="py-3 pr-3 text-stone-700">
                      {formatLabourCost(item.unit_price)}
                    </td>
                    <td className="py-3 text-right font-medium text-stone-900">
                      {formatLabourCost(item.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {quotation.items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-lg border border-stone-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-stone-400">{index + 1}</p>
                    <p className="font-medium text-stone-900">
                      {item.description}
                    </p>
                    <div className="mt-2">
                      <QuotationItemTypeBadge type={item.item_type} />
                    </div>
                    <p className="mt-2 text-sm text-stone-500">
                      {item.quantity} {item.unit} ×{" "}
                      {formatLabourCost(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-semibold text-stone-900">
                    {formatLabourCost(item.total_amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <dl className="mt-6 ml-auto w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">Subtotal</dt>
              <dd className="font-medium text-stone-900">
                {formatLabourCost(quotation.subtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">
                Discount
                {quotation.discount_type === "percentage"
                  ? ` (${quotation.discount_value}%)`
                  : ""}
              </dt>
              <dd className="font-medium text-stone-900">
                {formatLabourCost(quotation.discount_amount)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">
                Tax
                {quotation.tax_percentage
                  ? ` (${quotation.tax_percentage}%)`
                  : ""}
              </dt>
              <dd className="font-medium text-stone-900">
                {formatLabourCost(quotation.tax_amount)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-3 text-base">
              <dt className="font-semibold text-stone-900">Grand total</dt>
              <dd className="font-semibold text-stone-900">
                {formatLabourCost(quotation.total_amount)}
              </dd>
            </div>
          </dl>
        </section>

        {quotation.notes ? (
          <section className="border-t border-stone-200 py-6">
            <h4 className="text-xs font-semibold tracking-[0.16em] text-stone-400 uppercase">
              Notes
            </h4>
            <p className="mt-2 text-sm whitespace-pre-wrap text-stone-700">
              {quotation.notes}
            </p>
          </section>
        ) : null}

        {quotation.terms ? (
          <section className="border-t border-stone-200 py-6">
            <h4 className="text-xs font-semibold tracking-[0.16em] text-stone-400 uppercase">
              Terms & conditions
            </h4>
            <p className="mt-2 text-sm whitespace-pre-wrap text-stone-700">
              {quotation.terms}
            </p>
          </section>
        ) : null}

        <footer className="border-t border-stone-200 pt-4 text-xs text-stone-400">
          Prepared {formatTimestamp(quotation.created_at)}
          {quotation.created_by_name
            ? ` by ${quotation.created_by_name}`
            : ""}
        </footer>
      </article>

      {quotation.estimate_vs_actual ? (
        <EstimateVsActualCard
          quotationNumber={quotation.quotation_number}
          comparison={quotation.estimate_vs_actual}
        />
      ) : null}
    </div>
  );
}
