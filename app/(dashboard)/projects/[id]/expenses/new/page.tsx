import { NewExpenseScreen } from "@/components/expenses/expense-form-screens";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";

type NewExpensePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewExpensePageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.project) {
    return { title: "New expense" };
  }

  return { title: `New expense · ${result.project.name}` };
}

export default async function NewExpensePage({ params }: NewExpensePageProps) {
  const { id } = await params;
  return <NewExpenseScreen projectId={id} />;
}
