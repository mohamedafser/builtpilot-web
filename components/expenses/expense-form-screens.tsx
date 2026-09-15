"use client";

import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseFormSkeleton } from "@/components/expenses/expense-skeletons";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useApiData } from "@/hooks/use-api-data";
import { useProject } from "@/hooks/use-project";
import type { ExpenseDetail } from "@/lib/expenses/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function NewExpenseScreen({ projectId }: { projectId: string }) {
  const { project, error, notFound, isLoading } = useProject(projectId);

  if (isLoading) {
    return <ExpenseFormSkeleton />;
  }

  if (notFound) {
    return (
      <EmptyState
        title="Project not found"
        description="This project does not exist or you do not have access to it."
        action={
          <Link href="/projects" className={cn(linkButtonClassName("secondary"))}>
            Back to projects
          </Link>
        }
      />
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!project) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-lg font-semibold text-stone-900">Add expense</h2>
        <p className="mt-1 mb-5 text-sm text-stone-500">
          Record a project cost that is not labour or a material purchase.
        </p>
        <ExpenseForm projectId={projectId} />
      </CardContent>
    </Card>
  );
}

export function EditExpenseScreen({
  projectId,
  expenseId,
}: {
  projectId: string;
  expenseId: string;
}) {
  const { data, error, isLoading } = useApiData<{ expense: ExpenseDetail }>(
    `/api/projects/${projectId}/expenses/${expenseId}`,
  );

  if (isLoading) {
    return <ExpenseFormSkeleton />;
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

  if (!data?.expense) {
    return null;
  }

  if (data.expense.status === "void") {
    return (
      <Alert variant="error">
        Voided expenses cannot be edited. Open the expense to review it.
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-lg font-semibold text-stone-900">Edit expense</h2>
        <p className="mt-1 mb-5 text-sm text-stone-500">
          Update the details. The original record stays in project history.
        </p>
        <ExpenseForm projectId={projectId} expense={data.expense} />
      </CardContent>
    </Card>
  );
}
