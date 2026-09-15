import { ExpenseActions } from "@/components/expenses/expense-actions";
import { ExpenseCategoryBadge, ExpenseStatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import {
  EXPENSE_PAYMENT_METHOD_LABELS,
} from "@/constants/expense";
import type { PaginationMeta } from "@/lib/api/pagination";
import type { ExpenseListItem } from "@/lib/expenses/types";
import { formatLabourCost } from "@/lib/labour/money";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export function ExpenseList({
  projectId,
  expenses,
  pagination,
}: {
  projectId: string;
  expenses: ExpenseListItem[];
  pagination: PaginationMeta;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="hidden md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-t border-stone-100">
                <td className="px-4 py-3 text-stone-600">
                  {formatDate(expense.expense_date)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${projectId}/expenses/${expense.id}`}
                    className="font-medium text-stone-900 hover:text-amber-700"
                  >
                    {expense.description}
                  </Link>
                  {expense.status === "void" ? (
                    <div className="mt-1">
                      <ExpenseStatusBadge status={expense.status} />
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <ExpenseCategoryBadge category={expense.category} />
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {expense.vendor_name || "—"}
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {expense.payment_method
                    ? EXPENSE_PAYMENT_METHOD_LABELS[expense.payment_method]
                    : "—"}
                </td>
                <td className="px-4 py-3 font-medium text-stone-900">
                  {formatLabourCost(expense.amount)}
                </td>
                <td className="px-4 py-3">
                  <ExpenseActions
                    projectId={projectId}
                    expenseId={expense.id}
                    description={expense.description}
                    expenseDate={expense.expense_date}
                    voided={expense.status === "void"}
                    showView
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {expenses.map((expense) => (
          <article
            key={expense.id}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/projects/${projectId}/expenses/${expense.id}`}
                  className="font-semibold text-stone-900"
                >
                  {expense.description}
                </Link>
                <p className="mt-1 text-sm text-stone-500">
                  {formatDate(expense.expense_date)}
                </p>
              </div>
              <p className="text-base font-semibold text-stone-900">
                {formatLabourCost(expense.amount)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ExpenseCategoryBadge category={expense.category} />
              {expense.status === "void" ? (
                <ExpenseStatusBadge status={expense.status} />
              ) : null}
            </div>
            <p className="mt-3 text-sm text-stone-600">
              {expense.vendor_name || "No vendor"}
              {expense.payment_method
                ? ` · ${EXPENSE_PAYMENT_METHOD_LABELS[expense.payment_method]}`
                : ""}
            </p>
            <div className="mt-4">
              <ExpenseActions
                projectId={projectId}
                expenseId={expense.id}
                description={expense.description}
                expenseDate={expense.expense_date}
                voided={expense.status === "void"}
                showView
                layout="stack"
              />
            </div>
          </article>
        ))}
      </div>

      <Pagination {...pagination} />
    </div>
  );
}
