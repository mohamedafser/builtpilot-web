import { EditBoqScreen } from "@/components/boq/boq-form-screens";
import { getBoqById } from "@/lib/boq/queries";
import type { Metadata } from "next";

type EditBoqPageProps = {
  params: Promise<{ id: string; boqId: string }>;
};

export async function generateMetadata({
  params,
}: EditBoqPageProps): Promise<Metadata> {
  const { id, boqId } = await params;
  const result = await getBoqById(id, boqId);

  if (!result.boq) {
    return { title: "Edit BOQ" };
  }

  return { title: `Edit ${result.boq.name}` };
}

export default async function EditBoqPage({ params }: EditBoqPageProps) {
  const { id, boqId } = await params;
  return <EditBoqScreen projectId={id} boqId={boqId} />;
}
