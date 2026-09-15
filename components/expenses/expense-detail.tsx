"use client";

import { ExpenseActions } from "@/components/expenses/expense-actions";
import { ExpenseCategoryBadge, ExpenseStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EXPENSE_PAYMENT_METHOD_LABELS,
} from "@/constants/expense";
import { requestJson } from "@/lib/api/client";
import type { ExpenseDetail } from "@/lib/expenses/types";
import { formatLabourCost } from "@/lib/labour/money";
import { formatDate, formatTimestamp } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

function isPdf(path: string | null): boolean {
  return Boolean(path?.toLowerCase().endsWith(".pdf"));
}

export function ExpenseDetailView({
  projectId,
  expense,
  onUpdated,
}: {
  projectId: string;
  expense: ExpenseDetail;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const voided = expense.status === "void";

  function removeReceipt() {
    if (!window.confirm("Remove this receipt?")) {
      return;
    }

    setReceiptError(null);
    startTransition(async () => {
      const result = await requestJson<{ id: string }>(
        `/api/projects/${projectId}/expenses/${expense.id}/receipt`,
        { method: "DELETE" },
      );

      if (!result.ok) {
        setReceiptError(result.message);
        return;
      }

      onUpdated?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-stone-900">
                {expense.description}
              </h2>
              <ExpenseCategoryBadge category={expense.category} />
              <ExpenseStatusBadge status={expense.status} />
            </div>
            <p className="mt-3 text-2xl font-semibold text-stone-900">
              {formatLabourCost(expense.amount)}
            </p>
            <p className="mt-1 text-sm text-stone-500">
              {formatDate(expense.expense_date)}
            </p>
          </div>
          <ExpenseActions
            projectId={projectId}
            expenseId={expense.id}
            description={expense.description}
            expenseDate={expense.expense_date}
            voided={voided}
            layout="stack"
            onVoided={onUpdated}
          />
        </div>
        {voided ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            This expense is void and is not included in project cost totals.
          </p>
        ) : null}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Expense details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-stone-500">Vendor</dt>
              <dd className="mt-1 text-sm font-medium text-stone-800">
                {expense.vendor_name || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-500">Payment method</dt>
              <dd className="mt-1 text-sm font-medium text-stone-800">
                {expense.payment_method
                  ? EXPENSE_PAYMENT_METHOD_LABELS[expense.payment_method]
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-500">Reference number</dt>
              <dd className="mt-1 text-sm font-medium text-stone-800">
                {expense.reference_number || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-500">Created by</dt>
              <dd className="mt-1 text-sm font-medium text-stone-800">
                {expense.created_by_name || "Workspace member"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-500">Created</dt>
              <dd className="mt-1 text-sm font-medium text-stone-800">
                {formatTimestamp(expense.created_at)}
              </dd>
            </div>
          </dl>
          <div className="mt-5 border-t border-stone-100 pt-5">
            <h3 className="text-sm font-medium text-stone-500">Notes</h3>
            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-stone-700">
              {expense.notes || "No notes added."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          {expense.receipt_url ? (
            <div className="space-y-3">
              {isPdf(expense.receipt_path) ? (
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-sm font-medium text-amber-700 hover:text-amber-800"
                >
                  Open receipt PDF
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={expense.receipt_url}
                  alt="Expense receipt"
                  className="max-h-96 rounded-lg border border-stone-200 object-contain"
                />
              )}
              {!voided ? (
                <Button
                  variant="secondary"
                  onClick={removeReceipt}
                  disabled={isPending}
                >
                  {isPending ? "Removing..." : "Remove receipt"}
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-stone-500">No receipt attached.</p>
          )}
          {receiptError ? (
            <p className="mt-3 text-sm text-red-600">{receiptError}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
