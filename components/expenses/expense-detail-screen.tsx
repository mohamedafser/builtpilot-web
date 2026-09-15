"use client";

import { ExpenseDetailView } from "@/components/expenses/expense-detail";
import { ExpenseDetailSkeleton } from "@/components/expenses/expense-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requestJson } from "@/lib/api/client";
import type { ExpenseDetail } from "@/lib/expenses/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function ExpenseDetailScreen({
  projectId,
  expenseId,
}: {
  projectId: string;
  expenseId: string;
}) {
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);
    const result = await requestJson<{ expense: ExpenseDetail }>(
      `/api/projects/${projectId}/expenses/${expenseId}`,
    );

    if (!result.ok) {
      setExpense(null);
      setError(result.message);
      setIsLoading(false);
      return;
    }

    setExpense(result.data.expense);
    setIsLoading(false);
  }, [expenseId, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return <ExpenseDetailSkeleton />;
  }

  if (error === "Expense not found." || error === "Project not found.") {
    return (
      <EmptyState
        title="Expense not found"
        description="This expense does not exist or you do not have access to it."
        action={
          <Link
            href={`/projects/${projectId}/expenses`}
            className={cn(linkButtonClassName("secondary"))}
          >
            Back to expenses
          </Link>
        }
      />
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!expense) {
    return null;
  }

  return (
    <ExpenseDetailView
      projectId={projectId}
      expense={expense}
      onUpdated={() => void load({ silent: true })}
    />
  );
}
