import { ExpenseDetailScreen } from "@/components/expenses/expense-detail-screen";
import { getExpenseById } from "@/lib/expenses/queries";
import type { Metadata } from "next";

type ExpenseDetailPageProps = {
  params: Promise<{ id: string; expenseId: string }>;
};

export async function generateMetadata({
  params,
}: ExpenseDetailPageProps): Promise<Metadata> {
  const { id, expenseId } = await params;
  const result = await getExpenseById(id, expenseId);

  if (!result.expense) {
    return { title: "Expense" };
  }

  return { title: result.expense.description };
}

export default async function ExpenseDetailPage({
  params,
}: ExpenseDetailPageProps) {
  const { id, expenseId } = await params;
  return <ExpenseDetailScreen projectId={id} expenseId={expenseId} />;
}
