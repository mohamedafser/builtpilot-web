import { EditExpenseScreen } from "@/components/expenses/expense-form-screens";
import type { Metadata } from "next";

type EditExpensePageProps = {
  params: Promise<{ id: string; expenseId: string }>;
};

export const metadata: Metadata = {
  title: "Edit expense",
};

export default async function EditExpensePage({
  params,
}: EditExpensePageProps) {
  const { id, expenseId } = await params;
  return <EditExpenseScreen projectId={id} expenseId={expenseId} />;
}
