import { BoqItemDetailScreen } from "@/components/boq/boq-item-detail-screen";
import { getBoqItemById } from "@/lib/boq/queries";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BoqDetailSkeleton } from "@/components/boq/boq-skeletons";

type BoqItemPageProps = {
  params: Promise<{ id: string; boqId: string; itemId: string }>;
};

export async function generateMetadata({
  params,
}: BoqItemPageProps): Promise<Metadata> {
  const { id, boqId, itemId } = await params;
  const result = await getBoqItemById(id, boqId, itemId);

  if (!result.result) {
    return { title: "BOQ item" };
  }

  return { title: `${result.result.item.description} · Measurements` };
}

export default async function BoqItemPage({ params }: BoqItemPageProps) {
  const { id, boqId, itemId } = await params;

  return (
    <Suspense fallback={<BoqDetailSkeleton />}>
      <BoqItemDetailScreen projectId={id} boqId={boqId} itemId={itemId} />
    </Suspense>
  );
}
