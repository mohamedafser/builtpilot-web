import { ExpenseListScreen } from "@/components/expenses/expense-list-screen";
import { ExpenseListSkeleton } from "@/components/expenses/expense-skeletons";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";
import { Suspense } from "react";

type ExpensesPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ExpensesPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.project) {
    return { title: "Expenses" };
  }

  return { title: `Expenses · ${result.project.name}` };
}

export default async function ProjectExpensesPage({ params }: ExpensesPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<ExpenseListSkeleton />}>
      <ExpenseListScreen projectId={id} />
    </Suspense>
  );
}
